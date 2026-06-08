import crypto from "node:crypto";
import { importRecentGmailEmailsForUser } from "../routes/gmail";
import { validateGmailRecentImport, type GmailRecentImportInput } from "./gmail-validation";
import { extractImportedEmailForUser } from "./imported-email-extraction";
import { isGlobalAiReviewError, reviewJobForUser } from "./job-review";
import { prisma } from "./prisma";

type ProcessingSessionStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
type ReviewQueueItemStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export type JobAlertReviewQueueItem = {
  jobId: string;
  status: ReviewQueueItemStatus;
  company: string;
  title: string;
  errorMessage: string | null;
};

export type JobAlertProcessingSession = {
  id: string;
  userId: string;
  status: ProcessingSessionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  currentStep: string;
  importedCount: number;
  duplicateCount: number;
  emailsToExtractCount: number;
  extractedEmailsCount: number;
  failedEmailsCount: number;
  jobsCreatedCount: number;
  jobsReadyForReviewCount: number;
  jobsNeedingFullDescriptionCount: number;
  jobsLikelyIrrelevantCount: number;
  reviewQueue: JobAlertReviewQueueItem[];
  reviewDelaySeconds: number;
  currentReviewJobId: string | null;
  nextReviewAt: Date | null;
  reviewsCompletedCount: number;
  reviewsFailedCount: number;
  errors: string[];
  warnings: string[];
  createdJobIds: string[];
  cancelled: boolean;
};

export type StartJobAlertProcessingSessionInput = GmailRecentImportInput & {
  reviewDelaySeconds: number;
};

const DEFAULT_REVIEW_DELAY_SECONDS = 60;

let currentSession: JobAlertProcessingSession | null = null;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

const idleSession = (userId: string): JobAlertProcessingSession => ({
  id: "idle",
  userId,
  status: "idle",
  startedAt: null,
  completedAt: null,
  currentStep: "Idle",
  importedCount: 0,
  duplicateCount: 0,
  emailsToExtractCount: 0,
  extractedEmailsCount: 0,
  failedEmailsCount: 0,
  jobsCreatedCount: 0,
  jobsReadyForReviewCount: 0,
  jobsNeedingFullDescriptionCount: 0,
  jobsLikelyIrrelevantCount: 0,
  reviewQueue: [],
  reviewDelaySeconds: DEFAULT_REVIEW_DELAY_SECONDS,
  currentReviewJobId: null,
  nextReviewAt: null,
  reviewsCompletedCount: 0,
  reviewsFailedCount: 0,
  errors: [],
  warnings: [],
  createdJobIds: [],
  cancelled: false
});

const activeSession = () =>
  currentSession && currentSession.status === "running" ? currentSession : null;

const isCancelled = (session: JobAlertProcessingSession) =>
  session.cancelled || session.status === "cancelled";

const markCancelled = (session: JobAlertProcessingSession) => {
  session.status = "cancelled";
  session.cancelled = true;
  session.currentStep = "Cancelled";
  session.currentReviewJobId = null;
  session.nextReviewAt = null;
  session.completedAt = new Date();
};

const finishIfCancelled = (session: JobAlertProcessingSession) => {
  if (!isCancelled(session)) {
    return false;
  }

  markCancelled(session);
  return true;
};

const delay = async (session: JobAlertProcessingSession, seconds: number) => {
  if (seconds <= 0) {
    return;
  }

  const endAt = Date.now() + seconds * 1000;
  session.nextReviewAt = new Date(endAt);
  session.currentStep = "Waiting before next AI review";

  while (Date.now() < endAt) {
    if (finishIfCancelled(session)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, endAt - Date.now())));
  }

  session.nextReviewAt = null;
};

const buildReviewQueue = async (session: JobAlertProcessingSession) => {
  if (session.createdJobIds.length === 0) {
    session.reviewQueue = [];
    session.jobsReadyForReviewCount = 0;
    session.jobsNeedingFullDescriptionCount = 0;
    return;
  }

  const createdJobs = await prisma.job.findMany({
    where: {
      id: {
        in: session.createdJobIds
      },
      userId: session.userId,
      archivedAt: null
    },
    include: {
      description: true,
      aiReviews: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  session.jobsNeedingFullDescriptionCount = createdJobs.filter(
    (job) => job.status === "needs_full_description" || job.sourceQuality !== "full_description"
  ).length;

  const reviewJobs = createdJobs.filter(
    (job) =>
      job.sourceQuality === "full_description" &&
      Boolean(job.description?.fullText?.trim()) &&
      (!job.aiReviews[0] || job.status === "ready_for_analysis")
  );

  session.reviewQueue = reviewJobs.map((job) => ({
    jobId: job.id,
    status: "queued",
    company: job.company,
    title: job.title,
    errorMessage: null
  }));
  session.jobsReadyForReviewCount = session.reviewQueue.length;
};

const runReviewQueue = async (session: JobAlertProcessingSession) => {
  for (let index = 0; index < session.reviewQueue.length; index += 1) {
    if (finishIfCancelled(session)) {
      return;
    }

    const item = session.reviewQueue[index];
    item.status = "running";
    session.currentReviewJobId = item.jobId;
    session.nextReviewAt = null;
    session.currentStep = `Reviewing ${item.title} at ${item.company}`;

    try {
      await reviewJobForUser({ jobId: item.jobId, userId: session.userId });
      item.status = "completed";
      session.reviewsCompletedCount += 1;
    } catch (error) {
      const message = errorMessage(error);
      item.status = "failed";
      item.errorMessage = message;
      session.reviewsFailedCount += 1;
      session.errors.push(`Review failed for ${item.title} at ${item.company}: ${message}`);

      if (isGlobalAiReviewError(error)) {
        session.status = "failed";
        session.currentStep = "AI review stopped because provider authentication failed";
        session.currentReviewJobId = null;
        session.nextReviewAt = null;
        session.completedAt = new Date();
        return;
      }
    }

    session.currentReviewJobId = null;

    if (index < session.reviewQueue.length - 1) {
      await delay(session, session.reviewDelaySeconds);
    }
  }
};

const runSession = async (session: JobAlertProcessingSession, input: StartJobAlertProcessingSessionInput) => {
  try {
    session.currentStep = "Importing Gmail job alerts";
    const importResult = await importRecentGmailEmailsForUser(session.userId, {
      query: input.query,
      maxResults: input.maxResults
    });
    session.importedCount = importResult.imported;
    session.duplicateCount = importResult.duplicates;

    if (finishIfCancelled(session)) {
      return;
    }

    session.currentStep = "Loading active imported emails";
    const activeEmails = await prisma.importedEmail.findMany({
      where: {
        userId: session.userId,
        inboxStatus: {
          in: ["active", "needs_check"]
        },
        extractionStatus: {
          in: ["not_started", "failed"]
        }
      },
      orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }]
    });
    session.emailsToExtractCount = activeEmails.length;

    for (const email of activeEmails) {
      if (finishIfCancelled(session)) {
        return;
      }

      session.currentStep = `Extracting ${email.subject || "imported email"}`;

      try {
        const result = await extractImportedEmailForUser({
          importedEmailId: email.id,
          userId: session.userId,
          skipLikelyIrrelevant: true
        });

        if (result.skippedByClassification) {
          session.jobsLikelyIrrelevantCount += 1;
          session.warnings.push(
            `${email.subject || email.providerMessageId} hidden as likely irrelevant. ${result.classification.reason}`
          );
          continue;
        }

        session.extractedEmailsCount += 1;
        session.jobsCreatedCount += result.createdCount;
        session.createdJobIds.push(...result.jobs.map((job) => job.id));
        session.warnings.push(...result.warnings.map((warning) => `${email.subject}: ${warning}`));
      } catch (error) {
        session.failedEmailsCount += 1;
        session.errors.push(
          `Extraction failed for ${email.subject || email.providerMessageId}: ${errorMessage(error)}`
        );
      }
    }

    if (finishIfCancelled(session)) {
      return;
    }

    session.currentStep = "Building sequential AI review queue";
    await buildReviewQueue(session);

    if (session.reviewQueue.length > 0) {
      await runReviewQueue(session);
    }

    if (session.status === "failed" || finishIfCancelled(session)) {
      return;
    }

    session.status = "completed";
    session.currentStep = "Completed";
    session.currentReviewJobId = null;
    session.nextReviewAt = null;
    session.completedAt = new Date();
  } catch (error) {
    session.status = "failed";
    session.currentStep = "Failed";
    session.currentReviewJobId = null;
    session.nextReviewAt = null;
    session.completedAt = new Date();
    session.errors.push(errorMessage(error));
  }
};

export const startJobAlertProcessingSession = (input: {
  userId: string;
  gmailQuery?: string;
  maxResults?: number;
  reviewDelaySeconds?: number;
}) => {
  if (activeSession()) {
    throw new Error("A job-alert processing session is already running");
  }

  const gmailInput = validateGmailRecentImport({
    query: input.gmailQuery,
    maxResults: input.maxResults
  });
  const reviewDelaySeconds =
    input.reviewDelaySeconds === undefined ? DEFAULT_REVIEW_DELAY_SECONDS : input.reviewDelaySeconds;
  const session: JobAlertProcessingSession = {
    ...idleSession(input.userId),
    id: crypto.randomUUID(),
    status: "running",
    startedAt: new Date(),
    currentStep: "Queued",
    reviewDelaySeconds
  };

  currentSession = session;
  void runSession(session, {
    ...gmailInput,
    reviewDelaySeconds
  });

  return session;
};

export const getCurrentJobAlertProcessingSession = (userId: string) => {
  if (!currentSession || currentSession.userId !== userId) {
    return idleSession(userId);
  }

  return currentSession;
};

export const cancelJobAlertProcessingSession = (userId: string) => {
  if (!currentSession || currentSession.userId !== userId) {
    return idleSession(userId);
  }

  if (currentSession.status === "running") {
    markCancelled(currentSession);
  }

  return currentSession;
};
