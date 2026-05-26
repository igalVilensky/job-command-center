import { Router } from "express";
import { callExtractJobs, EXTRACT_PROMPT_VERSION, getAiProviderMetadata } from "../lib/ai-client";
import { validateExtractJobsBody, validateExtractionResponse } from "../lib/ai-validation";
import { HttpError } from "../lib/http-error";
import { serializeJob } from "../lib/job-validation";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

export const aiRouter = Router();

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

aiRouter.post(
  "/extract-jobs",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateExtractJobsBody(req.body);
    const providerMetadata = getAiProviderMetadata();
    const run = await prisma.automationRun.create({
      data: {
        userId,
        runType: "extract_jobs",
        provider: providerMetadata.provider,
        model: providerMetadata.model,
        status: "running",
        inputChars: input.sourceText.length,
        metadataJson: {
          promptVersion: EXTRACT_PROMPT_VERSION,
          sourceType: input.sourceType,
          sourceName: input.sourceName
        }
      }
    });

    try {
      const aiPayload = await callExtractJobs(input);
      const extraction = validateExtractionResponse(aiPayload);
      const jobs = await prisma.$transaction(async (tx) => {
        const source = await tx.jobSource.create({
          data: {
            userId,
            sourceType: input.sourceType,
            sourceName: input.sourceName ?? "Pasted text",
            metadataJson: {
              sourceKind: extraction.sourceKind,
              warnings: extraction.warnings,
              automationRunId: run.id
            }
          }
        });

        const createdJobs = [];

        for (const extractedJob of extraction.jobs) {
          const hasDescription =
            Boolean(extractedJob.descriptionSummary) ||
            Boolean(extractedJob.fullDescription) ||
            Boolean(input.sourceText);
          const created = await tx.job.create({
            data: {
              userId,
              sourceId: source.id,
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
                        rawSourceText: input.sourceText,
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

        return createdJobs;
      });

      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "succeeded",
          finishedAt: new Date(),
          metadataJson: {
            promptVersion: EXTRACT_PROMPT_VERSION,
            sourceType: input.sourceType,
            sourceName: input.sourceName,
            sourceKind: extraction.sourceKind,
            warnings: extraction.warnings,
            jobCount: jobs.length
          }
        }
      });

      res.status(201).json({
        jobs: jobs.map(serializeJob),
        automationRun: {
          id: run.id,
          status: "succeeded"
        },
        warnings: extraction.warnings
      });
    } catch (error) {
      const message = errorMessage(error);
      await markRunFailed(run.id, message);

      res.status(502).json({
        error: {
          message: "Mock AI extraction failed",
          statusCode: 502,
          runId: run.id,
          detail: message
        }
      });
    }
  })
);
