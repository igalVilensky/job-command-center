import crypto from "node:crypto";
import { Prisma, type ImportedEmail } from "@prisma/client";
import { importRecentGmailEmailsForUser } from "../routes/gmail";
import { isAiAuthenticationError, isAiRateLimitError } from "./ai-client";
import { validateGmailRecentImport, type GmailRecentImportInput } from "./gmail-validation";
import {
  extractImportedEmailForUser,
  importedEmailHasEnoughExtractionText,
  markImportExtractionPausedBudget
} from "./imported-email-extraction";
import {
  prefilterImportedEmail,
  type ImportedEmailPrefilterDecision,
  type ImportedEmailPrefilterResult
} from "./imported-email-classification";
import { isGlobalAiReviewError, reviewJobForUser } from "./job-review";
import { prisma } from "./prisma";

type ProcessingSessionStatus =
  | "idle"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "completed_with_paused_items"
  | "failed"
  | "cancelled";
type QueueItemStatus = "queued" | "running" | "completed" | "failed" | "skipped" | "paused";
type AiBudgetStatus = "available" | "running" | "paused_rate_limit" | "exhausted_for_run";

export type JobAlertExtractionQueueItem = {
  importedEmailId: string;
  status: QueueItemStatus;
  subject: string;
  from: string | null;
  prefilterDecision: ImportedEmailPrefilterDecision;
  jobLikelihoodScore: number;
  reason: string;
  errorMessage: string | null;
};

export type JobAlertReviewQueueItem = {
  jobId: string;
  status: QueueItemStatus;
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
  importedBatchEmailIds: string[];
  includeBacklog: boolean;
  maxEmailsToProcess: number;
  maxExtractionsPerRun: number;
  maxReviewsPerRun: number;
  emailsConsideredCount: number;
  emailsToExtractCount: number;
  emailsSkippedPrefilterCount: number;
  emailsPausedByBudgetCount: number;
  extractedEmailsCount: number;
  failedEmailsCount: number;
  duplicateSourceCount: number;
  jobsCreatedCount: number;
  jobsReadyForReviewCount: number;
  jobsNeedingFullDescriptionCount: number;
  jobsLikelyIrrelevantCount: number;
  extractionQueue: JobAlertExtractionQueueItem[];
  reviewQueue: JobAlertReviewQueueItem[];
  extractionDelaySeconds: number;
  reviewDelaySeconds: number;
  extractionBudgetStatus: AiBudgetStatus;
  reviewBudgetStatus: AiBudgetStatus;
  currentExtractionEmailId: string | null;
  currentReviewJobId: string | null;
  nextExtractionAt: Date | null;
  nextReviewAt: Date | null;
  reviewsCompletedCount: number;
  reviewsFailedCount: number;
  errors: string[];
  warnings: string[];
  createdJobIds: string[];
  cancelled: boolean;
};

export type StartJobAlertProcessingSessionInput = GmailRecentImportInput & {
  includeBacklog: boolean;
  maxEmailsToProcess: number;
  maxExtractionsPerRun: number;
  maxReviewsPerRun: number;
  extractionDelaySeconds: number;
  reviewDelaySeconds: number;
};

const DEFAULT_MAX_EMAILS_TO_PROCESS = 10;
const DEFAULT_MAX_EXTRACTIONS_PER_RUN = 3;
const DEFAULT_MAX_REVIEWS_PER_RUN = 3;
const DEFAULT_EXTRACTION_DELAY_SECONDS = 60;
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
  importedBatchEmailIds: [],
  includeBacklog: false,
  maxEmailsToProcess: DEFAULT_MAX_EMAILS_TO_PROCESS,
  maxExtractionsPerRun: DEFAULT_MAX_EXTRACTIONS_PER_RUN,
  maxReviewsPerRun: DEFAULT_MAX_REVIEWS_PER_RUN,
  emailsConsideredCount: 0,
  emailsToExtractCount: 0,
  emailsSkippedPrefilterCount: 0,
  emailsPausedByBudgetCount: 0,
  extractedEmailsCount: 0,
  failedEmailsCount: 0,
  duplicateSourceCount: 0,
  jobsCreatedCount: 0,
  jobsReadyForReviewCount: 0,
  jobsNeedingFullDescriptionCount: 0,
  jobsLikelyIrrelevantCount: 0,
  extractionQueue: [],
  reviewQueue: [],
  extractionDelaySeconds: DEFAULT_EXTRACTION_DELAY_SECONDS,
  reviewDelaySeconds: DEFAULT_REVIEW_DELAY_SECONDS,
  extractionBudgetStatus: "available",
  reviewBudgetStatus: "available",
  currentExtractionEmailId: null,
  currentReviewJobId: null,
  nextExtractionAt: null,
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
  session.currentExtractionEmailId = null;
  session.currentReviewJobId = null;
  session.nextExtractionAt = null;
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

const delay = async (
  session: JobAlertProcessingSession,
  seconds: number,
  queue: "extraction" | "review"
) => {
  if (seconds <= 0) {
    return;
  }

  const endAt = Date.now() + seconds * 1000;
  const date = new Date(endAt);

  if (queue === "extraction") {
    session.nextExtractionAt = date;
    session.currentStep = "Waiting before next AI extraction";
  } else {
    session.nextReviewAt = date;
    session.currentStep = "Waiting before next AI review";
  }

  while (Date.now() < endAt) {
    if (finishIfCancelled(session)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, endAt - Date.now())));
  }

  if (queue === "extraction") {
    session.nextExtractionAt = null;
  } else {
    session.nextReviewAt = null;
  }
};

const setCompletedStatus = (session: JobAlertProcessingSession) => {
  if (session.status === "failed" || finishIfCancelled(session)) {
    return;
  }

  const hasPausedItems =
    session.extractionBudgetStatus === "paused_rate_limit" ||
    session.extractionBudgetStatus === "exhausted_for_run" ||
    session.reviewBudgetStatus === "paused_rate_limit" ||
    session.reviewBudgetStatus === "exhausted_for_run" ||
    session.extractionQueue.some((item) => item.status === "paused") ||
    session.reviewQueue.some((item) => item.status === "paused");

  session.status = hasPausedItems
    ? "completed_with_paused_items"
    : session.errors.length > 0
      ? "completed_with_errors"
      : "completed";
  session.currentStep = hasPausedItems
    ? "Completed with paused AI-budget items"
    : session.errors.length > 0
      ? "Completed with errors"
      : "Completed";
  session.currentExtractionEmailId = null;
  session.currentReviewJobId = null;
  session.nextExtractionAt = null;
  session.nextReviewAt = null;
  session.completedAt = new Date();
};

const queueItemFromEmail = (
  email: ImportedEmail,
  prefilter: ImportedEmailPrefilterResult
): JobAlertExtractionQueueItem => ({
  importedEmailId: email.id,
  status: "queued",
  subject: email.subject || email.providerMessageId,
  from: email.fromName || email.fromEmail,
  prefilterDecision: prefilter.prefilterDecision,
  jobLikelihoodScore: prefilter.jobLikelihoodScore,
  reason: prefilter.reason,
  errorMessage: null
});

const persistPrefilter = async (
  email: ImportedEmail,
  prefilter: ImportedEmailPrefilterResult
) => {
  await prisma.importedEmail.update({
    where: { id: email.id },
    data: {
      triageReason: prefilter.reason,
      prefilterDecision: prefilter.prefilterDecision,
      jobLikelihoodScore: prefilter.jobLikelihoodScore,
      prefilterJson: prefilter as Prisma.InputJsonValue,
      lastProcessedAt: new Date()
    }
  });
};

const pauseEmailForBudget = async (
  session: JobAlertProcessingSession,
  item: JobAlertExtractionQueueItem,
  message: string
) => {
  item.status = "paused";
  item.errorMessage = message;
  session.emailsPausedByBudgetCount += 1;
  await markImportExtractionPausedBudget(item.importedEmailId, message);
};

const skipDuplicateSource = async (
  session: JobAlertProcessingSession,
  email: ImportedEmail,
  item: JobAlertExtractionQueueItem,
  prefilter: ImportedEmailPrefilterResult
) => {
  item.status = "skipped";
  session.duplicateSourceCount += 1;
  await prisma.importedEmail.update({
    where: { id: email.id },
    data: {
      extractionStatus: "duplicate_source",
      inboxStatus: "hidden",
      processedAt: null,
      hiddenAt: new Date(),
      lastProcessedAt: new Date(),
      triageReason: prefilter.reason,
      prefilterDecision: prefilter.prefilterDecision,
      jobLikelihoodScore: prefilter.jobLikelihoodScore,
      prefilterJson: prefilter as Prisma.InputJsonValue,
      errorMessage: null
    }
  });
};

const skipLowSignal = async (
  session: JobAlertProcessingSession,
  email: ImportedEmail,
  item: JobAlertExtractionQueueItem,
  prefilter: ImportedEmailPrefilterResult
) => {
  item.status = "skipped";
  session.emailsSkippedPrefilterCount += 1;
  session.jobsLikelyIrrelevantCount += 1;
  await prisma.importedEmail.update({
    where: { id: email.id },
    data: {
      extractionStatus: "ignored_low_signal",
      inboxStatus: "likely_irrelevant",
      processedAt: null,
      hiddenAt: new Date(),
      lastProcessedAt: new Date(),
      triageReason: prefilter.reason,
      prefilterDecision: prefilter.prefilterDecision,
      jobLikelihoodScore: prefilter.jobLikelihoodScore,
      prefilterJson: prefilter as Prisma.InputJsonValue,
      errorMessage: null
    }
  });
};

const skipNeedsManualCheck = async (
  session: JobAlertProcessingSession,
  email: ImportedEmail,
  item: JobAlertExtractionQueueItem,
  message: string,
  prefilter: ImportedEmailPrefilterResult
) => {
  item.status = "skipped";
  item.errorMessage = message;
  session.emailsSkippedPrefilterCount += 1;
  await prisma.importedEmail.update({
    where: { id: email.id },
    data: {
      extractionStatus: "needs_manual_check",
      inboxStatus: "needs_check",
      processedAt: null,
      hiddenAt: null,
      lastProcessedAt: new Date(),
      triageReason: message,
      prefilterDecision: "needs_manual_check",
      jobLikelihoodScore: prefilter.jobLikelihoodScore,
      prefilterJson: prefilter as Prisma.InputJsonValue,
      errorMessage: null
    }
  });
};

const activeExtractionStatuses = [
  "not_started",
  "failed",
  "needs_manual_check",
  "extraction_paused_budget"
];

const loadCandidateEmails = async (
  session: JobAlertProcessingSession,
  importedBatchEmailIds: string[]
) => {
  if (!session.includeBacklog && importedBatchEmailIds.length === 0) {
    return [];
  }

  const emails = await prisma.importedEmail.findMany({
    where: {
      userId: session.userId,
      inboxStatus: {
        in: ["active", "needs_check"]
      },
      extractionStatus: {
        in: activeExtractionStatuses
      },
      ...(session.includeBacklog
        ? {}
        : {
            id: {
              in: importedBatchEmailIds
            }
          })
    },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }]
  });
  const batchOrder = new Map(importedBatchEmailIds.map((id, index) => [id, index]));

  return emails.sort((left, right) => {
    const leftBatchIndex = batchOrder.get(left.id);
    const rightBatchIndex = batchOrder.get(right.id);

    if (leftBatchIndex !== undefined && rightBatchIndex !== undefined) {
      return leftBatchIndex - rightBatchIndex;
    }

    if (leftBatchIndex !== undefined) {
      return -1;
    }

    if (rightBatchIndex !== undefined) {
      return 1;
    }

    return (
      (right.receivedAt ?? right.createdAt).getTime() -
      (left.receivedAt ?? left.createdAt).getTime()
    );
  });
};

const markOverEmailCap = async (
  session: JobAlertProcessingSession,
  emails: ImportedEmail[],
  duplicateEmailIds: Set<string>
) => {
  const paused = emails.slice(session.maxEmailsToProcess);
  const message = "AI extraction paused because max emails to process was reached for this run.";

  if (paused.length === 0) {
    return;
  }

  session.extractionBudgetStatus = "exhausted_for_run";

  for (const email of paused) {
    const prefilter = prefilterImportedEmail(email, { duplicateSource: duplicateEmailIds.has(email.id) });
    const item = queueItemFromEmail(email, prefilter);

    item.status = "paused";
    item.errorMessage = message;
    session.extractionQueue.push(item);
    session.emailsPausedByBudgetCount += 1;
    await prisma.importedEmail.update({
      where: { id: email.id },
      data: {
        extractionStatus: "extraction_paused_budget",
        inboxStatus: "active",
        processedAt: null,
        hiddenAt: null,
        lastProcessedAt: new Date(),
        triageReason: message,
        prefilterDecision: prefilter.prefilterDecision,
        jobLikelihoodScore: prefilter.jobLikelihoodScore,
        prefilterJson: prefilter as Prisma.InputJsonValue,
        errorMessage: message
      }
    });
  }
};

const pauseRemainingExtractionItems = async (
  session: JobAlertProcessingSession,
  startIndex: number,
  message: string
) => {
  for (let index = startIndex; index < session.extractionQueue.length; index += 1) {
    const item = session.extractionQueue[index];

    if (item.status === "queued" || item.status === "running") {
      await pauseEmailForBudget(session, item, message);
    }
  }
};

const runExtractionQueue = async (
  session: JobAlertProcessingSession,
  emails: ImportedEmail[],
  duplicateEmailIds: Set<string>
) => {
  session.currentStep = "Prefiltering imported emails before AI extraction";

  const cappedEmails = emails.slice(0, session.maxEmailsToProcess);
  await markOverEmailCap(session, emails, duplicateEmailIds);

  const candidates = [];
  for (const email of cappedEmails) {
    if (finishIfCancelled(session)) {
      return false;
    }

    const prefilter = prefilterImportedEmail(email, { duplicateSource: duplicateEmailIds.has(email.id) });
    await persistPrefilter(email, prefilter);
    const item = queueItemFromEmail(email, prefilter);
    session.extractionQueue.push(item);
    candidates.push({ email, item, prefilter });
  }

  session.emailsToExtractCount = candidates.length;

  let extractionCallsStarted = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    if (finishIfCancelled(session)) {
      return false;
    }

    const { email, item, prefilter } = candidates[index];

    if (prefilter.prefilterDecision === "duplicate_source") {
      await skipDuplicateSource(session, email, item, prefilter);
      continue;
    }

    if (!prefilter.aiExtractionEligible) {
      await skipLowSignal(session, email, item, prefilter);
      continue;
    }

    if (!importedEmailHasEnoughExtractionText(email)) {
      await skipNeedsManualCheck(
        session,
        email,
        item,
        "Needs manual check before AI extraction because the saved source text is too short.",
        prefilter
      );
      continue;
    }

    if (extractionCallsStarted >= session.maxExtractionsPerRun) {
      session.extractionBudgetStatus = "exhausted_for_run";
      await pauseEmailForBudget(
        session,
        item,
        "AI extraction paused because max extractions for this run were reached."
      );
      continue;
    }

    if (extractionCallsStarted > 0) {
      await delay(session, session.extractionDelaySeconds, "extraction");
    }

    if (finishIfCancelled(session)) {
      return false;
    }

    extractionCallsStarted += 1;
    item.status = "running";
    session.extractionBudgetStatus = "running";
    session.currentExtractionEmailId = item.importedEmailId;
    session.nextExtractionAt = null;
    session.currentStep = `Extracting ${item.subject}`;

    try {
      const result = await extractImportedEmailForUser({
        importedEmailId: email.id,
        userId: session.userId,
        skipIneligiblePrefilter: true
      });

      if (result.skippedByClassification) {
        item.status = "skipped";
        session.emailsSkippedPrefilterCount += 1;
      } else {
        item.status = "completed";
        session.extractedEmailsCount += 1;
        session.jobsCreatedCount += result.createdCount;
        session.createdJobIds.push(...result.jobs.map((job) => job.id));
        session.warnings.push(...result.warnings.map((warning) => `${item.subject}: ${warning}`));
      }
    } catch (error) {
      const message = errorMessage(error);

      if (isAiRateLimitError(error)) {
        const userMessage =
          "AI extraction paused because provider rate limit was reached. Try again later or reduce max AI calls.";
        item.status = "paused";
        item.errorMessage = userMessage;
        session.emailsPausedByBudgetCount += 1;
        session.extractionBudgetStatus = "paused_rate_limit";
        session.currentStep = "AI extraction paused because provider rate limit was reached";
        session.warnings.push(userMessage);
        await pauseRemainingExtractionItems(session, index + 1, userMessage);
        session.currentExtractionEmailId = null;
        return false;
      }

      if (isAiAuthenticationError(error)) {
        item.status = "failed";
        item.errorMessage = message;
        session.status = "failed";
        session.currentStep = "AI extraction stopped because provider authentication failed";
        session.currentExtractionEmailId = null;
        session.completedAt = new Date();
        session.errors.push(`Extraction failed for ${item.subject}: ${message}`);
        return false;
      }

      item.status = "failed";
      item.errorMessage = message;
      session.failedEmailsCount += 1;
      session.errors.push(`Extraction failed for ${item.subject}: ${message}`);
    } finally {
      if (session.extractionBudgetStatus === "running") {
        session.extractionBudgetStatus = "available";
      }
      session.currentExtractionEmailId = null;
      session.nextExtractionAt = null;
    }
  }

  return true;
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

  session.jobsReadyForReviewCount = reviewJobs.length;
  session.reviewQueue = reviewJobs.map((job, index) => ({
    jobId: job.id,
    status: index < session.maxReviewsPerRun ? "queued" : "paused",
    company: job.company,
    title: job.title,
    errorMessage:
      index < session.maxReviewsPerRun
        ? null
        : "AI review paused because max reviews for this run were reached."
  }));

  if (reviewJobs.length > session.maxReviewsPerRun) {
    session.reviewBudgetStatus = "exhausted_for_run";
    session.warnings.push("AI review paused because max reviews for this run were reached.");
  }
};

const pauseRemainingReviewItems = (
  session: JobAlertProcessingSession,
  startIndex: number,
  message: string
) => {
  for (let index = startIndex; index < session.reviewQueue.length; index += 1) {
    const item = session.reviewQueue[index];

    if (item.status === "queued" || item.status === "running") {
      item.status = "paused";
      item.errorMessage = message;
    }
  }
};

const runReviewQueue = async (session: JobAlertProcessingSession) => {
  let reviewCallsStarted = 0;

  for (let index = 0; index < session.reviewQueue.length; index += 1) {
    if (finishIfCancelled(session)) {
      return;
    }

    const item = session.reviewQueue[index];
    if (item.status !== "queued") {
      continue;
    }

    if (reviewCallsStarted > 0) {
      await delay(session, session.reviewDelaySeconds, "review");
    }

    if (finishIfCancelled(session)) {
      return;
    }

    reviewCallsStarted += 1;
    item.status = "running";
    session.reviewBudgetStatus = "running";
    session.currentReviewJobId = item.jobId;
    session.nextReviewAt = null;
    session.currentStep = `Reviewing ${item.title} at ${item.company}`;

    try {
      await reviewJobForUser({ jobId: item.jobId, userId: session.userId });
      item.status = "completed";
      session.reviewsCompletedCount += 1;
    } catch (error) {
      const message = errorMessage(error);

      if (isAiRateLimitError(error)) {
        const userMessage =
          "AI review paused because provider rate limit was reached. Try again later or reduce max AI calls.";
        item.status = "paused";
        item.errorMessage = userMessage;
        session.reviewBudgetStatus = "paused_rate_limit";
        session.currentStep = "AI review paused because provider rate limit was reached";
        session.warnings.push(userMessage);
        pauseRemainingReviewItems(session, index + 1, userMessage);
        session.currentReviewJobId = null;
        return;
      }

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
    } finally {
      if (session.reviewBudgetStatus === "running") {
        session.reviewBudgetStatus = "available";
      }
      session.currentReviewJobId = null;
      session.nextReviewAt = null;
    }
  }
};

const runSession = async (
  session: JobAlertProcessingSession,
  input: StartJobAlertProcessingSessionInput
) => {
  try {
    session.currentStep = "Importing Gmail job alerts";
    const importResult = await importRecentGmailEmailsForUser(session.userId, {
      query: input.query,
      maxResults: input.maxResults
    });
    session.importedCount = importResult.imported;
    session.duplicateCount = importResult.duplicates;
    session.importedBatchEmailIds = importResult.emails.map((email) => email.id);

    if (finishIfCancelled(session)) {
      return;
    }

    session.currentStep = session.includeBacklog
      ? "Loading current import batch plus active backlog"
      : "Loading current import batch";
    const candidateEmails = await loadCandidateEmails(session, session.importedBatchEmailIds);
    session.emailsConsideredCount = candidateEmails.length;
    const duplicateEmailIds = new Set(importResult.duplicateEmailIds);

    const extractionCanContinue = await runExtractionQueue(session, candidateEmails, duplicateEmailIds);
    if (!extractionCanContinue || session.status === "failed" || finishIfCancelled(session)) {
      setCompletedStatus(session);
      return;
    }

    session.currentStep = "Building budgeted AI review queue";
    await buildReviewQueue(session);

    if (session.reviewQueue.some((item) => item.status === "queued")) {
      await runReviewQueue(session);
    }

    setCompletedStatus(session);
  } catch (error) {
    session.status = "failed";
    session.currentStep = "Failed";
    session.currentExtractionEmailId = null;
    session.currentReviewJobId = null;
    session.nextExtractionAt = null;
    session.nextReviewAt = null;
    session.completedAt = new Date();
    session.errors.push(errorMessage(error));
  }
};

export const startJobAlertProcessingSession = (input: {
  userId: string;
  gmailQuery?: string;
  maxResults?: number;
  includeBacklog?: boolean;
  maxEmailsToProcess?: number;
  maxExtractionsPerRun?: number;
  maxReviewsPerRun?: number;
  extractionDelaySeconds?: number;
  reviewDelaySeconds?: number;
}) => {
  if (activeSession()) {
    throw new Error("A job-alert processing session is already running");
  }

  const gmailInput = validateGmailRecentImport({
    query: input.gmailQuery,
    maxResults: input.maxResults
  });
  const includeBacklog = input.includeBacklog ?? false;
  const maxEmailsToProcess = input.maxEmailsToProcess ?? DEFAULT_MAX_EMAILS_TO_PROCESS;
  const maxExtractionsPerRun = input.maxExtractionsPerRun ?? DEFAULT_MAX_EXTRACTIONS_PER_RUN;
  const maxReviewsPerRun = input.maxReviewsPerRun ?? DEFAULT_MAX_REVIEWS_PER_RUN;
  const extractionDelaySeconds = input.extractionDelaySeconds ?? DEFAULT_EXTRACTION_DELAY_SECONDS;
  const reviewDelaySeconds = input.reviewDelaySeconds ?? DEFAULT_REVIEW_DELAY_SECONDS;
  const session: JobAlertProcessingSession = {
    ...idleSession(input.userId),
    id: crypto.randomUUID(),
    status: "running",
    startedAt: new Date(),
    currentStep: "Queued",
    includeBacklog,
    maxEmailsToProcess,
    maxExtractionsPerRun,
    maxReviewsPerRun,
    extractionDelaySeconds,
    reviewDelaySeconds
  };

  currentSession = session;
  void runSession(session, {
    ...gmailInput,
    includeBacklog,
    maxEmailsToProcess,
    maxExtractionsPerRun,
    maxReviewsPerRun,
    extractionDelaySeconds,
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
