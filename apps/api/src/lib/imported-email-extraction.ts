import { Prisma, type ImportedEmail } from "@prisma/client";
import {
  callExtractJobs,
  EXTRACT_PROMPT_VERSION,
  getAiProviderMetadata,
  isAiRateLimitError
} from "./ai-client";
import { type AiExtractedJob, validateExtractionResponse } from "./ai-validation";
import {
  classifyImportedEmail,
  prefilterImportedEmail,
  type ImportedEmailClassificationResult,
  type ImportedEmailPrefilterResult
} from "./imported-email-classification";
import { HttpError } from "./http-error";
import { prepareImportedEmailSource } from "./imported-email-source";
import { prisma } from "./prisma";

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

type ExtractedJobRecord = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

const IMPORT_PROVIDER = "gmail";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

const normalizedDedupeValue = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#*]+/g, " ")
    .trim();

const importedJobDedupeKey = (job: Pick<AiExtractedJob, "company" | "title">) =>
  `${normalizedDedupeValue(job.company)}::${normalizedDedupeValue(job.title)}`;

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

export const markImportExtractionFailed = async (id: string, message: string) => {
  await prisma.importedEmail
    .update({
      where: { id },
      data: {
        extractionStatus: "failed",
        inboxStatus: "active",
        processedAt: null,
        hiddenAt: null,
        lastProcessedAt: new Date(),
        errorMessage: message
      }
    })
    .catch(() => undefined);
};

export const markImportExtractionPausedBudget = async (id: string, message: string) => {
  await prisma.importedEmail
    .update({
      where: { id },
      data: {
        extractionStatus: "extraction_paused_budget",
        inboxStatus: "active",
        processedAt: null,
        hiddenAt: null,
        lastProcessedAt: new Date(),
        triageReason: message,
        errorMessage: message
      }
    })
    .catch(() => undefined);
};

export const importedEmailHasEnoughExtractionText = (
  email: Pick<ImportedEmail, "subject" | "snippet" | "bodyText">
) => {
  const compact = [email.subject, email.snippet, email.bodyText]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return compact.length >= 80 || Boolean(email.bodyText?.trim() && email.bodyText.trim().length >= 50);
};

export type ExtractImportedEmailResult = {
  jobs: ExtractedJobRecord[];
  email: ImportedEmail & {
    _count?: {
      jobs: number;
    };
  };
  warnings: string[];
  createdCount: number;
  skippedDuplicates: number;
  classification: ImportedEmailClassificationResult;
  prefilter: ImportedEmailPrefilterResult;
  skippedByClassification: boolean;
  automationRun: {
    id: string;
    status: string;
  } | null;
};

export const extractImportedEmailForUser = async (input: {
  importedEmailId: string;
  userId: string;
  skipLikelyIrrelevant?: boolean;
  skipIneligiblePrefilter?: boolean;
}): Promise<ExtractImportedEmailResult> => {
  const importedEmail = await prisma.importedEmail.findFirst({
    where: {
      id: input.importedEmailId,
      userId: input.userId
    }
  });

  if (!importedEmail) {
    throw new HttpError(404, "Imported email not found");
  }

  const classification = classifyImportedEmail(importedEmail);
  const prefilter = prefilterImportedEmail(importedEmail);
  const shouldSkipIneligible = input.skipLikelyIrrelevant || input.skipIneligiblePrefilter;

  if (shouldSkipIneligible && !prefilter.aiExtractionEligible) {
    const email = await prisma.importedEmail.update({
      where: { id: importedEmail.id },
      data: {
        inboxStatus: "likely_irrelevant",
        extractionStatus: "ignored_low_signal",
        hiddenAt: new Date(),
        lastProcessedAt: new Date(),
        triageReason: prefilter.reason,
        prefilterDecision: prefilter.prefilterDecision,
        jobLikelihoodScore: prefilter.jobLikelihoodScore,
        prefilterJson: prefilter as Prisma.InputJsonValue,
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

    return {
      jobs: [],
      email,
      warnings: [],
      createdCount: 0,
      skippedDuplicates: 0,
      classification,
      prefilter,
      skippedByClassification: true,
      automationRun: null
    };
  }

  if (shouldSkipIneligible && !importedEmailHasEnoughExtractionText(importedEmail)) {
    const message = "Needs manual check before AI extraction because the saved source text is too short.";
    const email = await prisma.importedEmail.update({
      where: { id: importedEmail.id },
      data: {
        inboxStatus: "needs_check",
        extractionStatus: "needs_manual_check",
        processedAt: null,
        hiddenAt: null,
        lastProcessedAt: new Date(),
        triageReason: message,
        prefilterDecision: "needs_manual_check",
        jobLikelihoodScore: prefilter.jobLikelihoodScore,
        prefilterJson: prefilter as Prisma.InputJsonValue,
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

    return {
      jobs: [],
      email,
      warnings: [],
      createdCount: 0,
      skippedDuplicates: 0,
      classification,
      prefilter,
      skippedByClassification: true,
      automationRun: null
    };
  }

  const preparedSource = prepareImportedEmailSource(importedEmail);
  const sourceText = preparedSource.sourceText.trim();

  if (!sourceText) {
    const message = "Imported email source text is required for extraction";
    await markImportExtractionFailed(importedEmail.id, message);
    throw new HttpError(400, message);
  }

  const sourceType = "gmail_import";
  const sourceName = importedEmail.subject;
  const sourcePreparationMetadata = {
    promptVersion: EXTRACT_PROMPT_VERSION,
    importedEmailId: importedEmail.id,
    provider: importedEmail.provider || IMPORT_PROVIDER,
    providerMessageId: importedEmail.providerMessageId,
    providerThreadId: importedEmail.providerThreadId,
    subject: importedEmail.subject,
    snippet: importedEmail.snippet,
    classification: classification.classification,
    prefilter,
    triageReason: prefilter.reason,
    sourceType,
    sourceName,
    originalLength: preparedSource.originalLength,
    cleanedLength: preparedSource.cleanedLength,
    rawPreview: preparedSource.rawPreview,
    cleanedPreview: preparedSource.cleanedPreview
  };
  const providerMetadata = getAiProviderMetadata();
  const run = await prisma.automationRun.create({
    data: {
      userId: input.userId,
      runType: "extract_imported_email",
      provider: providerMetadata.provider,
      model: providerMetadata.model,
      status: "running",
      inputChars: preparedSource.cleanedLength,
      metadataJson: sourcePreparationMetadata
    }
  });

  try {
    await prisma.importedEmail.update({
      where: { id: importedEmail.id },
      data: {
        triageReason: prefilter.reason,
        prefilterDecision: prefilter.prefilterDecision,
        jobLikelihoodScore: prefilter.jobLikelihoodScore,
        prefilterJson: prefilter as Prisma.InputJsonValue,
        lastProcessedAt: new Date()
      }
    });

    const aiPayload = await callExtractJobs({
      sourceText,
      sourceType,
      sourceName
    });
    const extraction = validateExtractionResponse(aiPayload);
    const result = await prisma.$transaction(async (tx) => {
      const existingJobs = await tx.job.findMany({
        where: {
          userId: input.userId,
          importedEmailId: importedEmail.id
        },
        select: {
          company: true,
          title: true
        }
      });
      const seenJobKeys = new Set(existingJobs.map(importedJobDedupeKey));
      const uniqueExtractedJobs: AiExtractedJob[] = [];
      const createdJobs: ExtractedJobRecord[] = [];
      let skippedDuplicates = 0;

      for (const extractedJob of extraction.jobs) {
        const dedupeKey = importedJobDedupeKey(extractedJob);

        if (seenJobKeys.has(dedupeKey)) {
          skippedDuplicates += 1;
          continue;
        }

        seenJobKeys.add(dedupeKey);
        uniqueExtractedJobs.push(extractedJob);
      }

      const source =
        uniqueExtractedJobs.length > 0
          ? await tx.jobSource.create({
              data: {
                userId: input.userId,
                sourceType,
                sourceName,
                externalId: importedEmail.providerMessageId,
                metadataJson: {
                  ...sourcePreparationMetadata,
                  sourceKind: extraction.sourceKind,
                  warnings: extraction.warnings,
                  automationRunId: run.id,
                  sourceLabel: importedEmail.sourceLabel
                }
              }
            })
          : null;

      if (source) {
        for (const extractedJob of uniqueExtractedJobs) {
          const hasDescription =
            Boolean(extractedJob.descriptionSummary) ||
            Boolean(extractedJob.fullDescription) ||
            Boolean(sourceText);
          const created = await tx.job.create({
            data: {
              userId: input.userId,
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
      }

      const jobCount = await tx.job.count({
        where: {
          userId: input.userId,
          importedEmailId: importedEmail.id
        }
      });
      const nextInboxStatus =
        jobCount > 0
          ? "processed"
          : classification.classification === "likely_irrelevant"
            ? "likely_irrelevant"
            : "needs_check";
      const now = new Date();
      const email = await tx.importedEmail.update({
        where: { id: importedEmail.id },
        data: {
          extractionStatus: "succeeded",
          inboxStatus: nextInboxStatus,
          processedAt: jobCount > 0 ? now : null,
          hiddenAt: nextInboxStatus === "likely_irrelevant" ? now : null,
          lastProcessedAt: now,
          triageReason: prefilter.reason,
          prefilterDecision: prefilter.prefilterDecision,
          jobLikelihoodScore: prefilter.jobLikelihoodScore,
          prefilterJson: prefilter as Prisma.InputJsonValue,
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

      return {
        jobs: createdJobs,
        email,
        createdCount: createdJobs.length,
        skippedDuplicates
      };
    });

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        metadataJson: {
          ...sourcePreparationMetadata,
          sourceKind: extraction.sourceKind,
          warnings: extraction.warnings,
          jobCount: result.email.jobCount,
          createdCount: result.createdCount,
          skippedDuplicates: result.skippedDuplicates
        }
      }
    });

    return {
      ...result,
      warnings: extraction.warnings,
      classification,
      prefilter,
      skippedByClassification: false,
      automationRun: {
        id: run.id,
        status: "succeeded"
      }
    };
  } catch (error) {
    const message = errorMessage(error);
    await Promise.all([
      markRunFailed(run.id, message),
      isAiRateLimitError(error)
        ? markImportExtractionPausedBudget(
            importedEmail.id,
            "AI extraction paused because provider rate limit was reached. Try again later or reduce max AI calls."
          )
        : markImportExtractionFailed(importedEmail.id, message)
    ]);
    throw error;
  }
};

export const rawMetadataJsonData = (value: unknown) =>
  value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
