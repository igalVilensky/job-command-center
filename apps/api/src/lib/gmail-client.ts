import { env } from "../config/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const BODY_TEXT_LIMIT = 100_000;

export const GMAIL_PROVIDER = "gmail";
export const GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
  "profile"
];

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  scope: string[];
};

export type GoogleUserInfo = {
  email: string;
  name: string | null;
};

export type GmailImportedMessage = {
  providerMessageId: string;
  providerThreadId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string;
  receivedAt: Date | null;
  sourceLabel: string | null;
  snippet: string | null;
  bodyText: string | null;
  rawMetadataJson: Record<string, unknown>;
};

type GmailMessageSummary = {
  id: string;
  threadId?: string;
};

type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: Record<string, unknown>;
  sizeEstimate?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const asNumber = (value: unknown) => (typeof value === "number" ? value : undefined);

const asStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;

const responsePayload = async (response: Response) => {
  const text = await response.text().catch(() => "");

  if (!text) {
    return { payload: null, text };
  }

  try {
    return { payload: JSON.parse(text) as unknown, text };
  } catch {
    return { payload: null, text };
  }
};

const safeFailureDetail = (payload: unknown, fallback: string) => {
  if (isRecord(payload)) {
    const error = payload.error;
    const description = payload.error_description;

    if (typeof description === "string" && description.trim()) {
      return description.trim();
    }

    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    if (isRecord(error)) {
      const message = error.message;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  }

  return fallback || "empty response body";
};

const fetchJson = async (url: string, init: RequestInit, label: string) => {
  const response = await fetch(url, init);
  const { payload, text } = await responsePayload(response);

  if (!response.ok) {
    throw new Error(`${label} failed: status=${response.status} detail=${safeFailureDetail(payload, text)}`);
  }

  return payload;
};

const postGoogleToken = async (body: URLSearchParams) =>
  fetchJson(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    },
    "Google token request"
  );

const normalizeTokenResponse = (payload: unknown): GoogleTokenSet => {
  if (!isRecord(payload)) {
    throw new Error("Google token response must be an object");
  }

  const accessToken = asString(payload.access_token).trim();

  if (!accessToken) {
    throw new Error("Google token response did not include an access token");
  }

  const expiresIn = asNumber(payload.expires_in);

  return {
    accessToken,
    refreshToken: asString(payload.refresh_token).trim() || null,
    expiresIn: expiresIn && Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
    scope: asString(payload.scope)
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean)
  };
};

export const googleOauthConfigured = () =>
  Boolean(env.googleClientId.trim() && env.googleClientSecret.trim() && env.googleOauthRedirectUrl.trim());

export const buildGoogleAuthUrl = (state: string) => {
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", env.googleOauthRedirectUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url.toString();
};

export const exchangeGoogleCode = async (code: string) => {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleOauthRedirectUrl,
    grant_type: "authorization_code"
  });

  return normalizeTokenResponse(await postGoogleToken(body));
};

export const refreshGoogleAccessToken = async (refreshToken: string) => {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: "refresh_token"
  });

  return normalizeTokenResponse(await postGoogleToken(body));
};

export const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const payload = await fetchJson(
    GOOGLE_USERINFO_URL,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    "Google userinfo request"
  );

  if (!isRecord(payload)) {
    throw new Error("Google userinfo response must be an object");
  }

  const email = asString(payload.email).trim().toLowerCase();

  if (!email) {
    throw new Error("Google userinfo response did not include an email address");
  }

  return {
    email,
    name: asString(payload.name).trim() || null
  };
};

export const listGmailMessages = async (
  accessToken: string,
  query: string,
  maxResults: number
): Promise<GmailMessageSummary[]> => {
  const url = new URL(GMAIL_MESSAGES_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));

  const payload = await fetchJson(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    "Gmail message list request"
  );

  if (!isRecord(payload)) {
    throw new Error("Gmail message list response must be an object");
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return messages
    .map((message): GmailMessageSummary | null => {
      if (!isRecord(message)) {
        return null;
      }

      const id = asString(message.id).trim();
      if (!id) {
        return null;
      }

      return {
        id,
        threadId: asString(message.threadId).trim() || undefined
      };
    })
    .filter((message): message is GmailMessageSummary => Boolean(message));
};

export const getGmailMessage = async (accessToken: string, id: string): Promise<GmailMessage> => {
  const url = new URL(`${GMAIL_MESSAGES_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set("format", "full");

  const payload = await fetchJson(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    "Gmail message get request"
  );

  if (!isRecord(payload)) {
    throw new Error("Gmail message response must be an object");
  }

  const messageId = asString(payload.id).trim();
  if (!messageId) {
    throw new Error("Gmail message response did not include an id");
  }

  return {
    id: messageId,
    threadId: asString(payload.threadId).trim() || undefined,
    labelIds: asStringArray(payload.labelIds),
    snippet: asString(payload.snippet).trim() || undefined,
    historyId: asString(payload.historyId).trim() || undefined,
    internalDate: asString(payload.internalDate).trim() || undefined,
    payload: isRecord(payload.payload) ? payload.payload : undefined,
    sizeEstimate: asNumber(payload.sizeEstimate)
  };
};

const decodeGmailBodyData = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return Buffer.from(padded, "base64").toString("utf8");
};

const htmlEntityDecode = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

const stripHtml = (value: string) =>
  htmlEntityDecode(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
  ).trim();

const partHeaders = (part: Record<string, unknown>) => {
  const headers = Array.isArray(part.headers) ? part.headers : [];
  const normalized = new Map<string, string>();

  for (const header of headers) {
    if (!isRecord(header)) {
      continue;
    }

    const name = asString(header.name).trim();
    const value = asString(header.value).trim();

    if (name && value) {
      normalized.set(name.toLowerCase(), value);
    }
  }

  return normalized;
};

const headerValue = (headers: Map<string, string>, name: string) => headers.get(name.toLowerCase()) ?? "";

const parseFromHeader = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return { fromEmail: null, fromName: null };
  }

  const angleMatch = trimmed.match(/^(.*)<([^>]+)>$/);

  if (angleMatch) {
    const name = angleMatch[1]
      .trim()
      .replace(/^"|"$/g, "")
      .replace(/\\"/g, '"')
      .trim();
    const email = angleMatch[2].trim().toLowerCase();

    return {
      fromEmail: email || null,
      fromName: name || null
    };
  }

  return trimmed.includes("@")
    ? { fromEmail: trimmed.toLowerCase(), fromName: null }
    : { fromEmail: null, fromName: trimmed };
};

const receivedDate = (message: GmailMessage, headers: Map<string, string>) => {
  const internalMs = message.internalDate ? Number(message.internalDate) : NaN;

  if (Number.isFinite(internalMs) && internalMs > 0) {
    return new Date(internalMs);
  }

  const dateHeader = headerValue(headers, "date");
  const parsedDate = dateHeader ? new Date(dateHeader) : null;

  return parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
};

const collectTextParts = (part: Record<string, unknown> | undefined, mimeType: string): string[] => {
  if (!part) {
    return [];
  }

  const parts: string[] = [];
  const currentMimeType = asString(part.mimeType).toLowerCase();
  const filename = asString(part.filename).trim();
  const body = isRecord(part.body) ? part.body : null;
  const data = body ? asString(body.data) : "";

  if (!filename && currentMimeType === mimeType && data) {
    parts.push(decodeGmailBodyData(data));
  }

  if (Array.isArray(part.parts)) {
    for (const child of part.parts) {
      if (isRecord(child)) {
        parts.push(...collectTextParts(child, mimeType));
      }
    }
  }

  return parts;
};

const textBody = (payload: Record<string, unknown> | undefined) => {
  const plainText = collectTextParts(payload, "text/plain").join("\n\n").trim();

  if (plainText) {
    return plainText;
  }

  const htmlText = collectTextParts(payload, "text/html").map(stripHtml).join("\n\n").trim();

  return htmlText || null;
};

const truncateBodyText = (bodyText: string | null) => {
  if (!bodyText) {
    return null;
  }

  return bodyText.length > BODY_TEXT_LIMIT ? bodyText.slice(0, BODY_TEXT_LIMIT) : bodyText;
};

const metadataPart = (part: Record<string, unknown> | undefined): Record<string, unknown> | null => {
  if (!part) {
    return null;
  }

  const body = isRecord(part.body) ? part.body : {};
  const parts = Array.isArray(part.parts)
    ? part.parts
        .filter(isRecord)
        .map(metadataPart)
        .filter((value): value is Record<string, unknown> => Boolean(value))
    : [];

  return {
    mimeType: asString(part.mimeType) || null,
    filename: asString(part.filename) || null,
    headers: Array.isArray(part.headers)
      ? part.headers.filter(isRecord).map((header) => ({
          name: asString(header.name) || null,
          value: asString(header.value) || null
        }))
      : [],
    bodySize: asNumber(body.size) ?? null,
    parts
  };
};

export const gmailMessageToImportedEmail = (message: GmailMessage): GmailImportedMessage => {
  const headers = partHeaders(message.payload ?? {});
  const from = parseFromHeader(headerValue(headers, "from"));
  const body = truncateBodyText(textBody(message.payload));

  return {
    providerMessageId: message.id,
    providerThreadId: message.threadId ?? null,
    fromEmail: from.fromEmail,
    fromName: from.fromName,
    subject: headerValue(headers, "subject") || "(no subject)",
    receivedAt: receivedDate(message, headers),
    sourceLabel: message.labelIds?.join(",") || null,
    snippet: message.snippet ?? null,
    bodyText: body,
    rawMetadataJson: {
      id: message.id,
      threadId: message.threadId ?? null,
      labelIds: message.labelIds ?? [],
      historyId: message.historyId ?? null,
      internalDate: message.internalDate ?? null,
      sizeEstimate: message.sizeEstimate ?? null,
      payload: metadataPart(message.payload)
    }
  };
};
