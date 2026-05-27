import { Prisma } from "@prisma/client";
import { Router } from "express";
import { callExtractJobs, EXTRACT_PROMPT_VERSION, getAiProviderMetadata } from "../lib/ai-client";
import { validateExtractionResponse } from "../lib/ai-validation";
import { HttpError } from "../lib/http-error";
import {
  serializeImportedEmail,
  validateExtractionStatusFilter,
  validateImportedEmailSimulate,
  validateImportStatusFilter
} from "../lib/import-validation";
import { serializeJob } from "../lib/job-validation";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

export const importsRouter = Router();

const IMPORT_PROVIDER = "gmail";

const jobInclude = {
  description: true,
  source: true,
  aiReviews: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  }
} as const;

const getUserId = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  return req.user.id;
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

const markRunFailed = async (runId: string, message: string) => {
  await prisma.automationRun
    .update({
      where: { id: runId },
      data: {
        status: "failed",
        errorMessage: message,
        finishedAt: new Date()
      }
    })
    .catch(() => undefined);
};

const markImportExtractionFailed = async (id: string, message: string) => {
  await prisma.importedEmail
    .update({
      where: { id },
      data: {
        extractionStatus: "failed",
        errorMessage: message
      }
    })
    .catch(() => undefined);
};

const rawMetadataJsonData = (value: unknown) =>
  value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

importsRouter.get(
  "/emails",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const importStatus = validateImportStatusFilter(req.query.importStatus);
    const extractionStatus = validateExtractionStatusFilter(req.query.extractionStatus);
    const emails = await prisma.importedEmail.findMany({
      where: {
        userId,
        ...(importStatus ? { importStatus } : {}),
        ...(extractionStatus ? { extractionStatus } : {})
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

    res.status(200).json({ emails: emails.map(serializeImportedEmail) });
  })
);

importsRouter.post(
  "/emails/simulate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateImportedEmailSimulate(req.body);
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

importsRouter.post(
  "/emails/:id/extract",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const importedEmail = await prisma.importedEmail.findFirst({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!importedEmail) {
      throw new HttpError(404, "Imported email not found");
    }

    const sourceText = importedEmail.bodyText?.trim();

    if (!sourceText) {
      throw new HttpError(400, "Imported email bodyText is required for extraction");
    }

    const providerMetadata = getAiProviderMetadata();
    const run = await prisma.automationRun.create({
      data: {
        userId,
        runType: "extract_imported_email",
        provider: providerMetadata.provider,
        model: providerMetadata.model,
        status: "running",
        inputChars: sourceText.length,
        metadataJson: {
          promptVersion: EXTRACT_PROMPT_VERSION,
          importedEmailId: importedEmail.id,
          provider: importedEmail.provider,
          providerMessageId: importedEmail.providerMessageId,
          sourceType: "gmail_import",
          sourceName: importedEmail.subject
        }
      }
    });

    try {
      const aiPayload = await callExtractJobs({
        sourceText,
        sourceType: "gmail_import",
        sourceName: importedEmail.subject
      });
      const extraction = validateExtractionResponse(aiPayload);
      const result = await prisma.$transaction(async (tx) => {
        const source = await tx.jobSource.create({
          data: {
            userId,
            sourceType: "gmail_import",
            sourceName: importedEmail.subject,
            externalId: importedEmail.providerMessageId,
            metadataJson: {
              sourceKind: extraction.sourceKind,
              warnings: extraction.warnings,
              automationRunId: run.id,
              importedEmailId: importedEmail.id,
              provider: importedEmail.provider,
              providerThreadId: importedEmail.providerThreadId,
              sourceLabel: importedEmail.sourceLabel
            }
          }
        });

        const createdJobs = [];

        for (const extractedJob of extraction.jobs) {
          const hasDescription =
            Boolean(extractedJob.descriptionSummary) ||
            Boolean(extractedJob.fullDescription) ||
            Boolean(sourceText);
          const created = await tx.job.create({
            data: {
              userId,
              sourceId: source.id,
              importedEmailId: importedEmail.id,
              company: extractedJob.company,
              title: extractedJob.title,
              location: extractedJob.location || null,
              remoteType: extractedJob.remoteType,
              salaryMinEur: extractedJob.salaryMinEur,
              salaryMaxEur: extractedJob.salaryMaxEur,
              salaryText: extractedJob.salaryText || null,
              url: extractedJob.url || null,
              sourceQuality: extractedJob.sourceQuality,
              status: extractedJob.needsFullDescription
                ? "needs_full_description"
                : "ready_for_analysis",
              ...(hasDescription
                ? {
                    description: {
                      create: {
                        summaryText: extractedJob.descriptionSummary || null,
                        fullText: extractedJob.fullDescription || null,
                        rawSourceText: sourceText,
                        language: null
                      }
                    }
                  }
                : {})
            },
            include: jobInclude
          });

          createdJobs.push(created);
        }

        const jobCount = await tx.job.count({
          where: {
            userId,
            importedEmailId: importedEmail.id
          }
        });
        const email = await tx.importedEmail.update({
          where: { id: importedEmail.id },
          data: {
            extractionStatus: "succeeded",
            jobCount,
            errorMessage: null
          },
          include: {
            _count: {
              select: {
                jobs: true
              }
            }
          }
        });

        return { jobs: createdJobs, email };
      });

      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "succeeded",
          finishedAt: new Date(),
          metadataJson: {
            promptVersion: EXTRACT_PROMPT_VERSION,
            importedEmailId: importedEmail.id,
            provider: importedEmail.provider,
            providerMessageId: importedEmail.providerMessageId,
            sourceType: "gmail_import",
            sourceName: importedEmail.subject,
            sourceKind: extraction.sourceKind,
            warnings: extraction.warnings,
            jobCount: result.jobs.length
          }
        }
      });

      res.status(201).json({
        jobs: result.jobs.map(serializeJob),
        email: serializeImportedEmail(result.email),
        automationRun: {
          id: run.id,
          status: "succeeded"
        },
        warnings: extraction.warnings
      });
    } catch (error) {
      const message = errorMessage(error);
      await Promise.all([
        markRunFailed(run.id, message),
        markImportExtractionFailed(importedEmail.id, message)
      ]);

      res.status(502).json({
        error: {
          message: "Imported email extraction failed",
          statusCode: 502,
          runId: run.id,
          detail: message
        }
      });
    }
  })
);
