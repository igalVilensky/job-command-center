import { Router } from "express";
import { classifyImportedEmail } from "../lib/imported-email-classification";
import { extractImportedEmailForUser, rawMetadataJsonData } from "../lib/imported-email-extraction";
import {
  type ImportedEmailScope,
  serializeImportedEmail,
  validateExtractionStatusFilter,
  validateImportedEmailScope,
  validateImportedEmailSimulate,
  validateImportedEmailTriage,
  validateImportStatusFilter,
  validateInboxStatusFilter
} from "../lib/import-validation";
import { serializeJob } from "../lib/job-validation";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { HttpError } from "../lib/http-error";

export const importsRouter = Router();

const IMPORT_PROVIDER = "gmail";

const getUserId = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  return req.user.id;
};

const importScopeWhere = (scope: ImportedEmailScope) => {
  if (scope === "all") {
    return {};
  }

  if (scope === "history") {
    return {
      inboxStatus: {
        in: ["processed", "hidden", "likely_irrelevant"]
      }
    };
  }

  if (scope === "processed") {
    return { inboxStatus: "processed" };
  }

  if (scope === "hidden") {
    return {
      inboxStatus: {
        in: ["hidden", "likely_irrelevant"]
      }
    };
  }

  if (scope === "irrelevant") {
    return { inboxStatus: "likely_irrelevant" };
  }

  if (scope === "needs_check") {
    return { inboxStatus: "needs_check" };
  }

  if (scope === "failed") {
    return { extractionStatus: "failed" };
  }

  return {
    OR: [
      {
        inboxStatus: {
          in: ["active", "needs_check"]
        }
      },
      {
        extractionStatus: "failed"
      }
    ]
  };
};

const triageUpdateData = (inboxStatus: string, triageReason?: string | null) => {
  const now = new Date();
  const data = {
    inboxStatus,
    ...(triageReason !== undefined ? { triageReason } : {})
  };

  if (inboxStatus === "processed") {
    return {
      ...data,
      processedAt: now,
      hiddenAt: null
    };
  }

  if (inboxStatus === "hidden" || inboxStatus === "likely_irrelevant") {
    return {
      ...data,
      processedAt: null,
      hiddenAt: now
    };
  }

  return {
    ...data,
    processedAt: null,
    hiddenAt: null
  };
};

importsRouter.get(
  "/emails",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const importStatus = validateImportStatusFilter(req.query.importStatus);
    const extractionStatus = validateExtractionStatusFilter(req.query.extractionStatus);
    const inboxStatus = validateInboxStatusFilter(req.query.inboxStatus);
    const scope = validateImportedEmailScope(req.query.scope);
    const emails = await prisma.importedEmail.findMany({
      where: {
        userId,
        ...importScopeWhere(scope),
        ...(importStatus ? { importStatus } : {}),
        ...(extractionStatus ? { extractionStatus } : {}),
        ...(inboxStatus ? { inboxStatus } : {})
      },
      include: {
        _count: {
          select: {
            jobs: true
          }
        }
      },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }]
    });

    res.status(200).json({ emails: emails.map(serializeImportedEmail), scope });
  })
);

importsRouter.post(
  "/emails/simulate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateImportedEmailSimulate(req.body);
    const classification = classifyImportedEmail(input);
    const existing = await prisma.importedEmail.findUnique({
      where: {
        userId_provider_providerMessageId: {
          userId,
          provider: IMPORT_PROVIDER,
          providerMessageId: input.providerMessageId
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
      res.status(200).json({
        email: serializeImportedEmail(existing),
        duplicate: true
      });
      return;
    }

    const email = await prisma.importedEmail.create({
      data: {
        userId,
        provider: IMPORT_PROVIDER,
        providerMessageId: input.providerMessageId,
        providerThreadId: input.providerThreadId,
        fromEmail: input.fromEmail,
        fromName: input.fromName,
        subject: input.subject,
        receivedAt: input.receivedAt,
        sourceLabel: input.sourceLabel,
        snippet: input.snippet,
        bodyText: input.bodyText,
        triageReason: classification.reason,
        ...(input.rawMetadataJson !== undefined
          ? { rawMetadataJson: rawMetadataJsonData(input.rawMetadataJson) }
          : {})
      },
      include: {
        _count: {
          select: {
            jobs: true
          }
        }
      }
    });

    res.status(201).json({
      email: serializeImportedEmail(email),
      duplicate: false
    });
  })
);

importsRouter.patch(
  "/emails/:id/triage",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateImportedEmailTriage(req.body);
    const existing = await prisma.importedEmail.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!existing) {
      throw new HttpError(404, "Imported email not found");
    }

    const email = await prisma.importedEmail.update({
      where: { id: existing.id },
      data: triageUpdateData(input.inboxStatus, input.triageReason),
      include: {
        _count: {
          select: {
            jobs: true
          }
        }
      }
    });

    res.status(200).json({ email: serializeImportedEmail(email) });
  })
);

importsRouter.post(
  "/emails/:id/extract",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);

    try {
      const result = await extractImportedEmailForUser({
        importedEmailId: req.params.id,
        userId
      });

      res.status(201).json({
        jobs: result.jobs.map(serializeJob),
        email: serializeImportedEmail(result.email),
        automationRun: result.automationRun,
        warnings: result.warnings,
        createdCount: result.createdCount,
        skippedDuplicates: result.skippedDuplicates,
        classification: result.classification
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      res.status(502).json({
        error: {
          message: "Imported email extraction failed",
          statusCode: 502,
          detail: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  })
);
