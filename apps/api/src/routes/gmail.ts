import { Prisma, type EmailAccount } from "@prisma/client";
import crypto from "node:crypto";
import { Router } from "express";
import { env } from "../config/env";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getGmailMessage,
  GoogleApiError,
  GMAIL_OAUTH_SCOPES,
  GMAIL_PROVIDER,
  GMAIL_READONLY_SCOPE,
  gmailMessageToImportedEmail,
  googleOauthConfigured,
  listGmailMessages,
  refreshGoogleAccessToken
} from "../lib/gmail-client";
import { validateGmailRecentImport } from "../lib/gmail-validation";
import { HttpError } from "../lib/http-error";
import { classifyImportedEmail, prefilterImportedEmail } from "../lib/imported-email-classification";
import { serializeImportedEmail } from "../lib/import-validation";
import { prisma } from "../lib/prisma";
import {
  assertTokenEncryptionConfigured,
  decryptToken,
  encryptToken
} from "../lib/token-encryption";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

export const gmailRouter = Router();

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

const getUserId = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  return req.user.id;
};

const redirectToWeb = (gmail: "connected" | "error", reason?: string) => {
  const url = new URL(env.webUrl);
  url.searchParams.set("gmail", gmail);

  if (reason) {
    url.searchParams.set("reason", reason);
  }

  return url.toString();
};

const pruneExpiredOauthStates = () => {
  const now = Date.now();

  for (const [state, value] of oauthStates) {
    if (value.expiresAt <= now) {
      oauthStates.delete(state);
    }
  }
};

const createOauthState = (userId: string) => {
  pruneExpiredOauthStates();

  const state = crypto.randomBytes(32).toString("base64url");
  oauthStates.set(state, {
    userId,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS
  });

  return state;
};

const consumeOauthState = (state: unknown) => {
  pruneExpiredOauthStates();

  if (typeof state !== "string" || !state.trim()) {
    return null;
  }

  const value = oauthStates.get(state);
  oauthStates.delete(state);

  if (!value || value.expiresAt <= Date.now()) {
    return null;
  }

  return value;
};

const assertGmailConfigured = () => {
  if (!googleOauthConfigured()) {
    throw new HttpError(400, "Google OAuth is not configured");
  }

  try {
    assertTokenEncryptionConfigured();
  } catch {
    throw new HttpError(400, "Email token encryption is not configured");
  }
};

const tokenScopes = (scopes: string[]) => (scopes.length > 0 ? scopes : GMAIL_OAUTH_SCOPES);

const hasGmailReadScope = (scopes: string[]) => tokenScopes(scopes).includes(GMAIL_READONLY_SCOPE);

const safeEmailAccount = (account: EmailAccount | null) => ({
  connected:
    Boolean(account) &&
    account?.status === "connected" &&
    Boolean(account.accessTokenEncrypted || account.refreshTokenEncrypted) &&
    hasGmailReadScope(account.scopes),
  emailAddress: account?.emailAddress ?? null,
  displayName: account?.displayName ?? null,
  status: account?.status ?? "disconnected",
  lastSyncAt: account?.lastSyncAt?.toISOString() ?? null
});

const findLatestGmailAccount = (userId: string) =>
  prisma.emailAccount.findFirst({
    where: {
      userId,
      provider: GMAIL_PROVIDER
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

const findConnectedGmailAccount = async (userId: string) => {
  const account = await prisma.emailAccount.findFirst({
    where: {
      userId,
      provider: GMAIL_PROVIDER,
      status: "connected"
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (!account || (!account.accessTokenEncrypted && !account.refreshTokenEncrypted)) {
    throw new HttpError(400, "Gmail is not connected");
  }

  if (!hasGmailReadScope(account.scopes)) {
    throw new HttpError(
      400,
      "Gmail connection is missing read permission. Reconnect Gmail and approve Gmail read access."
    );
  }

  return account;
};

const tokenExpiresAt = (expiresIn: number | null) =>
  expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

const storeGmailAccount = async (input: {
  userId: string;
  emailAddress: string;
  displayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
}) => {
  const existing = await prisma.emailAccount.findFirst({
    where: {
      userId: input.userId,
      provider: GMAIL_PROVIDER,
      emailAddress: input.emailAddress
    }
  });
  const encryptedRefreshToken = input.refreshToken
    ? encryptToken(input.refreshToken)
    : existing?.refreshTokenEncrypted ?? null;
  const data = {
    emailAddress: input.emailAddress,
    displayName: input.displayName,
    accessTokenEncrypted: encryptToken(input.accessToken),
    refreshTokenEncrypted: encryptedRefreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: tokenScopes(input.scopes),
    status: "connected"
  };

  if (existing) {
    return prisma.emailAccount.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.emailAccount.create({
    data: {
      userId: input.userId,
      provider: GMAIL_PROVIDER,
      ...data
    }
  });
};

const disconnectGmailAccount = (accountId: string) =>
  prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      status: "disconnected",
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenExpiresAt: null
    }
  });

const isRevokedGoogleTokenError = (error: unknown) =>
  error instanceof GoogleApiError &&
  error.statusCode === 400 &&
  /expired|revoked|invalid_grant/i.test(error.detail);

const isInsufficientScopeError = (error: unknown) =>
  error instanceof GoogleApiError &&
  error.statusCode === 403 &&
  /insufficient|scope|permission/i.test(error.detail);

const gmailAccessToken = async (account: EmailAccount) => {
  const shouldRefresh =
    !account.accessTokenEncrypted ||
    Boolean(account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS);

  if (!shouldRefresh && account.accessTokenEncrypted) {
    return {
      account,
      accessToken: decryptToken(account.accessTokenEncrypted)
    };
  }

  if (!account.refreshTokenEncrypted) {
    throw new HttpError(400, "Gmail connection cannot refresh access. Reconnect Gmail.");
  }

  const refreshToken = decryptToken(account.refreshTokenEncrypted);
  let refreshed;

  try {
    refreshed = await refreshGoogleAccessToken(refreshToken);
  } catch (error) {
    if (isRevokedGoogleTokenError(error)) {
      await disconnectGmailAccount(account.id);
      throw new HttpError(400, "Gmail authorization expired or was revoked. Reconnect Gmail.");
    }

    throw error;
  }

  const updated = await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.accessToken),
      tokenExpiresAt: tokenExpiresAt(refreshed.expiresIn),
      scopes: refreshed.scope.length > 0 ? refreshed.scope : account.scopes
    }
  });

  return {
    account: updated,
    accessToken: refreshed.accessToken
  };
};

const createImportedEmailFromGmail = async (
  userId: string,
  message: ReturnType<typeof gmailMessageToImportedEmail>
) => {
  const classification = classifyImportedEmail(message);
  const prefilter = prefilterImportedEmail(message);
  const existing = await prisma.importedEmail.findUnique({
    where: {
      userId_provider_providerMessageId: {
        userId,
        provider: GMAIL_PROVIDER,
        providerMessageId: message.providerMessageId
      }
    },
    include: {
      _count: {
        select: {
          jobs: true
        }
      }
    }
  });

  if (existing) {
    return {
      email: existing,
      duplicate: true
    };
  }

  const email = await prisma.importedEmail.create({
    data: {
      userId,
      provider: GMAIL_PROVIDER,
      providerMessageId: message.providerMessageId,
      providerThreadId: message.providerThreadId,
      fromEmail: message.fromEmail,
      fromName: message.fromName,
      subject: message.subject,
      receivedAt: message.receivedAt,
      sourceLabel: message.sourceLabel,
      snippet: message.snippet,
      bodyText: message.bodyText,
      triageReason: classification.reason,
      prefilterDecision: prefilter.prefilterDecision,
      jobLikelihoodScore: prefilter.jobLikelihoodScore,
      prefilterJson: prefilter as Prisma.InputJsonValue,
      rawMetadataJson: message.rawMetadataJson as Prisma.InputJsonValue
    },
    include: {
      _count: {
        select: {
          jobs: true
        }
      }
    }
  });

  return {
    email,
    duplicate: false
  };
};

gmailRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const account = await findLatestGmailAccount(userId);

    res.status(200).json(safeEmailAccount(account));
  })
);

gmailRouter.get(
  "/oauth/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    assertGmailConfigured();

    const userId = getUserId(req as AuthenticatedRequest);
    const state = createOauthState(userId);

    res.status(200).json({
      authUrl: buildGoogleAuthUrl(state)
    });
  })
);

gmailRouter.get(
  "/oauth/callback",
  asyncHandler(async (req, res) => {
    const state = consumeOauthState(req.query.state);

    if (!state) {
      res.redirect(302, redirectToWeb("error", "invalid_state"));
      return;
    }

    if (req.query.error) {
      res.redirect(302, redirectToWeb("error", "google_error"));
      return;
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";

    if (!code) {
      res.redirect(302, redirectToWeb("error", "missing_code"));
      return;
    }

    try {
      assertGmailConfigured();

      const tokens = await exchangeGoogleCode(code);
      const scopes = tokenScopes(tokens.scope);

      if (!hasGmailReadScope(scopes)) {
        res.redirect(302, redirectToWeb("error", "missing_gmail_scope"));
        return;
      }

      const userInfo = await fetchGoogleUserInfo(tokens.accessToken);

      await storeGmailAccount({
        userId: state.userId,
        emailAddress: userInfo.email,
        displayName: userInfo.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokenExpiresAt(tokens.expiresIn),
        scopes
      });

      res.redirect(302, redirectToWeb("connected"));
    } catch {
      res.redirect(302, redirectToWeb("error", "callback_failed"));
    }
  })
);

gmailRouter.post(
  "/disconnect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);

    await prisma.emailAccount.updateMany({
      where: {
        userId,
        provider: GMAIL_PROVIDER
      },
      data: {
        status: "disconnected",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null
      }
    });

    res.status(200).json({ ok: true });
  })
);

export const importRecentGmailEmailsForUser = async (
  userId: string,
  input: ReturnType<typeof validateGmailRecentImport>
) => {
  const connectedAccount = await findConnectedGmailAccount(userId);
  assertGmailConfigured();

  const { account, accessToken } = await gmailAccessToken(connectedAccount);
  const emails = [];
  const importedEmailIds = [];
  const duplicateEmailIds = [];
  let imported = 0;
  let duplicates = 0;

  try {
    const messageSummaries = await listGmailMessages(accessToken, input.query, input.maxResults);

    for (const summary of messageSummaries) {
      const gmailMessage = await getGmailMessage(accessToken, summary.id);
      const importedMessage = gmailMessageToImportedEmail(gmailMessage);
      const result = await createImportedEmailFromGmail(userId, importedMessage);

      if (result.duplicate) {
        duplicates += 1;
        duplicateEmailIds.push(result.email.id);
      } else {
        imported += 1;
        importedEmailIds.push(result.email.id);
      }

      emails.push(serializeImportedEmail(result.email));
    }
  } catch (error) {
    if (isInsufficientScopeError(error)) {
      await disconnectGmailAccount(account.id);
      throw new HttpError(
        400,
        "Gmail connection is missing read permission. Reconnect Gmail and approve Gmail read access."
      );
    }

    throw error;
  }

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      lastSyncAt: new Date()
    }
  });

  return {
    imported,
    duplicates,
    emails,
    importedEmailIds,
    duplicateEmailIds,
    query: input.query
  };
};

gmailRouter.post(
  "/import/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateGmailRecentImport(req.body);
    const result = await importRecentGmailEmailsForUser(userId, input);

    res.status(200).json(result);
  })
);
