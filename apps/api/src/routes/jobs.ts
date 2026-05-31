import { Router } from "express";
import { callReviewJob, getAiProviderMetadata, REVIEW_PROMPT_VERSION } from "../lib/ai-client";
import { validateReviewResponse } from "../lib/ai-validation";
import { HttpError } from "../lib/http-error";
import {
  hasFullDescription,
  serializeAiReview,
  serializeJob,
  shouldCreateDescription,
  validateJobApplicationStatusFilter,
  validateJobCreate,
  validateJobPipelineUpdate,
  validateJobStatusFilter,
  validateJobUpdate,
  validateJobUserDecisionFilter
} from "../lib/job-validation";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

export const jobsRouter = Router();

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

const findOwnedJob = async (id: string, userId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id,
      userId
    },
    include: jobInclude
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return job;
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

jobsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const includeArchived = req.query.includeArchived === "true";
    const status = validateJobStatusFilter(req.query.status);
    const userDecision = validateJobUserDecisionFilter(req.query.userDecision);
    const applicationStatus = validateJobApplicationStatusFilter(req.query.applicationStatus);
    const jobs = await prisma.job.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(status ? { status } : {}),
        ...(userDecision ? { userDecision } : {}),
        ...(applicationStatus ? { applicationStatus } : {})
      },
      include: jobInclude,
      orderBy: {
        importedAt: "desc"
      }
    });

    res.status(200).json({ jobs: jobs.map(serializeJob) });
  })
);

jobsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateJobCreate(req.body);
    const hasDescription = hasFullDescription(input.description);

    const job = await prisma.$transaction(async (tx) => {
      const source = await tx.jobSource.create({
        data: {
          userId,
          sourceType: "manual",
          sourceName: "Manual"
        }
      });

      const created = await tx.job.create({
        data: {
          ...input.job,
          userId,
          sourceId: source.id,
          status: hasDescription ? "ready_for_analysis" : "imported",
          sourceQuality: hasDescription ? "full_description" : "manual_note",
          ...(shouldCreateDescription(input.description)
            ? {
                description: {
                  create: input.description
                }
              }
            : {})
        },
        include: jobInclude
      });

      return created;
    });

    res.status(201).json({ job: serializeJob(job) });
  })
);

jobsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const job = await findOwnedJob(req.params.id, userId);

    res.status(200).json({ job: serializeJob(job) });
  })
);

jobsRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const existingJob = await findOwnedJob(req.params.id, userId);

    const input = validateJobUpdate(req.body);
    const nextSalaryMin =
      input.job.salaryMinEur === undefined ? existingJob.salaryMinEur : input.job.salaryMinEur;
    const nextSalaryMax =
      input.job.salaryMaxEur === undefined ? existingJob.salaryMaxEur : input.job.salaryMaxEur;

    if (
      nextSalaryMin !== null &&
      nextSalaryMax !== null &&
      nextSalaryMin !== undefined &&
      nextSalaryMax !== undefined &&
      nextSalaryMin > nextSalaryMax
    ) {
      throw new HttpError(400, "salaryMinEur must be less than or equal to salaryMaxEur");
    }

    const job = await prisma.$transaction(async (tx) => {
      if (input.hasDescriptionUpdate) {
        await tx.jobDescription.upsert({
          where: { jobId: req.params.id },
          update: input.description,
          create: {
            jobId: req.params.id,
            ...input.description
          }
        });
      }

      return tx.job.update({
        where: { id: req.params.id },
        data: input.job,
        include: jobInclude
      });
    });

    res.status(200).json({ job: serializeJob(job) });
  })
);

jobsRouter.patch(
  "/:id/pipeline",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const existingJob = await findOwnedJob(req.params.id, userId);
    const input = validateJobPipelineUpdate(req.body);
    const nextApplicationStatus =
      input.applicationStatus === undefined
        ? existingJob.applicationStatus
        : input.applicationStatus;
    const nextAppliedAt = input.appliedAt === undefined ? existingJob.appliedAt : input.appliedAt;
    const nextRejectedAt =
      input.rejectedAt === undefined ? existingJob.rejectedAt : input.rejectedAt;
    const now = new Date();

    if (nextApplicationStatus === "applied" && !nextAppliedAt) {
      input.appliedAt = now;
    }

    if (nextApplicationStatus === "rejected" && !nextRejectedAt) {
      input.rejectedAt = now;
    }

    const job = await prisma.job.update({
      where: { id: existingJob.id },
      data: input,
      include: jobInclude
    });

    res.status(200).json({ job: serializeJob(job) });
  })
);

jobsRouter.post(
  "/:id/review",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const existingJob = await findOwnedJob(req.params.id, userId);
    const providerMetadata = getAiProviderMetadata();
    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
    const activeCv = await prisma.candidateCv.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    const candidateProfile = {
      ...profile,
      activeCv: activeCv
        ? {
            id: activeCv.id,
            sourceType: activeCv.sourceType,
            sourceName: activeCv.sourceName,
            sourceText: activeCv.sourceText.slice(0, 4000),
            parsedProfileJson: activeCv.parsedProfileJson
          }
        : null
    };
    const inputText = [
      profile.profession,
      profile.bio,
      profile.targetRoles.join(", "),
      profile.strongSkills.join(", "),
      profile.secondarySkills.join(", "),
      profile.engineeringSkills.join(", "),
      profile.aiSkills.join(", "),
      profile.experienceSummary,
      existingJob.title,
      existingJob.company,
      existingJob.description?.summaryText,
      existingJob.description?.fullText,
      existingJob.description?.rawSourceText
    ]
      .filter(Boolean)
      .join("\n");
    const run = await prisma.automationRun.create({
      data: {
        userId,
        jobId: existingJob.id,
        runType: "review_job",
        provider: providerMetadata.provider,
        model: providerMetadata.model,
        status: "running",
        inputChars: inputText.length,
        metadataJson: {
          promptVersion: REVIEW_PROMPT_VERSION
        }
      }
    });

    try {
      const aiPayload = await callReviewJob({
        candidateProfile,
        job: {
          id: existingJob.id,
          company: existingJob.company,
          title: existingJob.title,
          location: existingJob.location,
          remoteType: existingJob.remoteType,
          salaryMinEur: existingJob.salaryMinEur,
          salaryMaxEur: existingJob.salaryMaxEur,
          salaryText: existingJob.salaryText,
          url: existingJob.url,
          sourceQuality: existingJob.sourceQuality,
          status: existingJob.status
        },
        description: existingJob.description
          ? {
              summaryText: existingJob.description.summaryText,
              fullText: existingJob.description.fullText,
              rawSourceText: existingJob.description.rawSourceText,
              language: existingJob.description.language
            }
          : null
      });
      const reviewResponse = validateReviewResponse(aiPayload);

      const result = await prisma.$transaction(async (tx) => {
        const review = await tx.aiReview.create({
          data: {
            jobId: existingJob.id,
            provider: providerMetadata.provider,
            model: providerMetadata.model,
            promptVersion: REVIEW_PROMPT_VERSION,
            score: reviewResponse.score,
            decision: reviewResponse.decision,
            reviewText: reviewResponse.review,
            riskFlags: reviewResponse.riskFlags,
            cvAngle: reviewResponse.cvAngle,
            clarificationQuestions: reviewResponse.clarificationQuestions,
            rawResponseJson: reviewResponse
          }
        });
        const job = await tx.job.update({
          where: { id: existingJob.id },
          data: {
            status: "analyzed"
          },
          include: jobInclude
        });

        await tx.automationRun.update({
          where: { id: run.id },
          data: {
            status: "succeeded",
            finishedAt: new Date(),
            metadataJson: {
              promptVersion: REVIEW_PROMPT_VERSION,
              confidence: reviewResponse.confidence,
              decision: reviewResponse.decision,
              score: reviewResponse.score
            }
          }
        });

        return { review, job };
      });

      res.status(201).json({
        review: serializeAiReview(result.review),
        job: serializeJob(result.job),
        automationRun: {
          id: run.id,
          status: "succeeded"
        }
      });
    } catch (error) {
      const message = errorMessage(error);
      await markRunFailed(run.id, message);

      res.status(502).json({
        error: {
          message: "AI review failed",
          statusCode: 502,
          runId: run.id,
          detail: message
        }
      });
    }
  })
);

jobsRouter.post(
  "/:id/archive",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    await findOwnedJob(req.params.id, userId);

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        archivedAt: new Date(),
        status: "archived"
      },
      include: jobInclude
    });

    res.status(200).json({ job: serializeJob(job) });
  })
);
