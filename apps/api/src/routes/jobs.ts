import { Router } from "express";
import { HttpError } from "../lib/http-error";
import { reviewJobForUser } from "../lib/job-review";
import {
  hasFullDescription,
  serializeAiReview,
  serializeJob,
  shouldCreateDescription,
  validateJobEnrichment,
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
  "/:id/enrich",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const existingJob = await findOwnedJob(req.params.id, userId);
    const input = validateJobEnrichment(req.body);

    const job = await prisma.$transaction(async (tx) => {
      if (input.hasDescriptionUpdate) {
        await tx.jobDescription.upsert({
          where: { jobId: existingJob.id },
          update: input.description,
          create: {
            jobId: existingJob.id,
            ...input.description
          }
        });
      }

      return tx.job.update({
        where: { id: existingJob.id },
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

    try {
      const result = await reviewJobForUser({ jobId: req.params.id, userId });

      res.status(201).json({
        review: serializeAiReview(result.review),
        job: serializeJob(result.job),
        automationRun: result.automationRun
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      res.status(502).json({
        error: {
          message: "AI review failed",
          statusCode: 502,
          detail: error instanceof Error ? error.message : "Unknown error"
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
