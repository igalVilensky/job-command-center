import {
  callReviewJob,
  getAiProviderMetadata,
  isAiAuthenticationError,
  REVIEW_PROMPT_VERSION
} from "./ai-client";
import { validateReviewResponse } from "./ai-validation";
import { HttpError } from "./http-error";
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

export const findOwnedJobForReview = async (id: string, userId: string) => {
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

export const isGlobalAiReviewError = (error: unknown) => {
  return isAiAuthenticationError(error);
};

export const reviewJobForUser = async (input: { jobId: string; userId: string }) => {
  const existingJob = await findOwnedJobForReview(input.jobId, input.userId);
  const providerMetadata = getAiProviderMetadata();
  const profile = await prisma.candidateProfile.upsert({
    where: { userId: input.userId },
    update: {},
    create: { userId: input.userId }
  });
  const activeCv = await prisma.candidateCv.findFirst({
    where: {
      userId: input.userId,
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
    profile.salaryMinEur ? `salaryMinEur: ${profile.salaryMinEur}` : null,
    profile.salaryMaxEur ? `salaryMaxEur: ${profile.salaryMaxEur}` : null,
    profile.minimumSalaryEur ? `legacyMinimumSalaryEur: ${profile.minimumSalaryEur}` : null,
    profile.acceptableRemoteTypes.join(", "),
    profile.preferredLocations.join(", "),
    profile.locationNotes,
    profile.salaryNotes,
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
      userId: input.userId,
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
          ...(reviewResponse.fitBreakdown
            ? {
                fitBreakdownJson: reviewResponse.fitBreakdown
              }
            : {}),
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

    return {
      ...result,
      automationRun: {
        id: run.id,
        status: "succeeded"
      }
    };
  } catch (error) {
    const message = errorMessage(error);
    await markRunFailed(run.id, message);
    throw error;
  }
};
