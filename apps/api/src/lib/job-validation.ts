import type { AiReview, Job, JobDescription, JobSource } from "@prisma/client";
import { HttpError } from "./http-error";

const jobStatuses = new Set([
  "imported",
  "needs_full_description",
  "ready_for_analysis",
  "analysis_pending",
  "analyzed",
  "shortlisted",
  "applied",
  "follow_up_needed",
  "interviewing",
  "rejected",
  "offer",
  "archived",
  "error"
]);

const remoteTypes = new Set([
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite",
  "unknown"
]);

const sourceQualities = new Set([
  "full_description",
  "partial_description",
  "digest_summary",
  "email_summary",
  "manual_note",
  "unknown"
]);

const enrichmentSourceQualities = new Set([
  "unknown",
  "digest_summary",
  "email_summary",
  "partial_description",
  "full_description"
]);

const userDecisions = new Set([
  "undecided",
  "interested",
  "maybe",
  "not_interested",
  "applied",
  "rejected",
  "interviewing",
  "offer",
  "archived"
]);

const applicationStatuses = new Set([
  "not_started",
  "preparing",
  "applied",
  "follow_up_needed",
  "interviewing",
  "rejected",
  "offer",
  "accepted",
  "declined"
]);

const createFields = new Set([
  "company",
  "title",
  "location",
  "remoteType",
  "salaryMinEur",
  "salaryMaxEur",
  "salaryText",
  "url",
  "externalSourceId",
  "fullDescription",
  "summaryText",
  "rawSourceText",
  "language"
]);

const updateFields = new Set([
  ...createFields,
  "status",
  "sourceQuality"
]);

const enrichmentFields = new Set([
  "url",
  "fullDescription",
  "summaryText",
  "language",
  "sourceQuality"
]);

const pipelineFields = new Set([
  "userDecision",
  "applicationStatus",
  "userNotes",
  "nextAction",
  "followUpDate",
  "appliedAt",
  "rejectedAt"
]);

type JobDescriptionInput = {
  summaryText?: string | null;
  fullText?: string | null;
  rawSourceText?: string | null;
  language?: string | null;
};

export type JobCreateData = {
  job: Pick<Job, "company" | "title"> &
    Partial<
      Pick<
        Job,
        | "location"
        | "remoteType"
        | "salaryMinEur"
        | "salaryMaxEur"
        | "salaryText"
        | "url"
        | "externalSourceId"
      >
    >;
  description: JobDescriptionInput;
};

export type JobUpdateData = {
  job: Partial<
    Pick<
      Job,
      | "company"
      | "title"
      | "location"
      | "remoteType"
      | "salaryMinEur"
      | "salaryMaxEur"
      | "salaryText"
      | "url"
      | "externalSourceId"
      | "status"
      | "sourceQuality"
    >
  >;
  description: JobDescriptionInput;
  hasDescriptionUpdate: boolean;
};

export type JobEnrichmentData = {
  job: Partial<Pick<Job, "url" | "sourceQuality" | "status">>;
  description: JobDescriptionInput;
  hasDescriptionUpdate: boolean;
};

export type JobPipelineUpdateData = Partial<
  Pick<
    Job,
    | "userDecision"
    | "applicationStatus"
    | "userNotes"
    | "nextAction"
    | "followUpDate"
    | "appliedAt"
    | "rejectedAt"
  >
>;

type JobWithRelations = Job & {
  description: JobDescription | null;
  source: JobSource | null;
  aiReviews?: AiReview[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rejectUnknownFields = (body: Record<string, unknown>, allowedFields: Set<string>) => {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown job fields: ${unknownFields.join(", ")}`);
  }
};

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} is required`);
  }

  return trimmed;
};

const optionalString = (value: unknown, field: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string or null`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const optionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, `${field} must be a positive integer or null`);
  }

  return value;
};

const optionalUrl = (value: unknown) => {
  const url = optionalString(value, "url");

  if (!url) {
    return url;
  }

  try {
    return new URL(url).toString();
  } catch {
    throw new HttpError(400, "url must be a valid URL or null");
  }
};

const optionalHttpUrl = (value: unknown) => {
  const url = optionalString(value, "url");

  if (!url) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported URL protocol");
    }

    return parsedUrl.toString();
  } catch {
    throw new HttpError(400, "url must be a valid http or https URL or null");
  }
};

const optionalRemoteType = (value: unknown) => {
  const remoteType = optionalString(value, "remoteType");

  if (remoteType === undefined || remoteType === null) {
    return remoteType;
  }

  if (!remoteTypes.has(remoteType)) {
    throw new HttpError(400, "remoteType is not supported");
  }

  return remoteType;
};

const optionalStatus = (value: unknown) => {
  const status = optionalString(value, "status");

  if (status === undefined || status === null) {
    return status;
  }

  if (!jobStatuses.has(status)) {
    throw new HttpError(400, "status is not supported");
  }

  if (status === "archived") {
    throw new HttpError(400, "Use the archive endpoint to archive jobs");
  }

  return status;
};

const optionalSourceQuality = (value: unknown) => {
  const sourceQuality = optionalString(value, "sourceQuality");

  if (sourceQuality === undefined || sourceQuality === null) {
    return sourceQuality;
  }

  if (!sourceQualities.has(sourceQuality)) {
    throw new HttpError(400, "sourceQuality is not supported");
  }

  return sourceQuality;
};

const optionalEnrichmentSourceQuality = (value: unknown) => {
  const sourceQuality = optionalString(value, "sourceQuality");

  if (sourceQuality === undefined || sourceQuality === null) {
    return sourceQuality;
  }

  if (!enrichmentSourceQualities.has(sourceQuality)) {
    throw new HttpError(400, "sourceQuality is not supported for enrichment");
  }

  return sourceQuality;
};

const optionalUserDecision = (value: unknown) => {
  const userDecision = optionalString(value, "userDecision");

  if (userDecision === undefined || userDecision === null) {
    return userDecision;
  }

  if (!userDecisions.has(userDecision)) {
    throw new HttpError(400, "userDecision is not supported");
  }

  return userDecision;
};

const optionalApplicationStatus = (value: unknown) => {
  const applicationStatus = optionalString(value, "applicationStatus");

  if (applicationStatus === undefined || applicationStatus === null) {
    return applicationStatus;
  }

  if (!applicationStatuses.has(applicationStatus)) {
    throw new HttpError(400, "applicationStatus is not supported");
  }

  return applicationStatus;
};

const optionalDate = (value: unknown, field: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a valid date string or null`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} must be a valid date string or null`);
  }

  return date;
};

const readDescription = (body: Record<string, unknown>) => ({
  summaryText: optionalString(body.summaryText, "summaryText"),
  fullText: optionalString(body.fullDescription, "fullDescription"),
  rawSourceText: optionalString(body.rawSourceText, "rawSourceText"),
  language: optionalString(body.language, "language")
});

const limitedString = (value: unknown, field: string, maxLength: number) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} must not be empty`);
  }

  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
};

const optionalLimitedString = (value: unknown, field: string, maxLength: number) => {
  const normalized = optionalString(value, field);

  if (normalized && normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return normalized;
};

const hasDescriptionText = (description: JobDescriptionInput) =>
  Boolean(description.summaryText || description.fullText || description.rawSourceText);

const validateSalaryRange = (salaryMinEur?: number | null, salaryMaxEur?: number | null) => {
  if (
    salaryMinEur !== undefined &&
    salaryMinEur !== null &&
    salaryMaxEur !== undefined &&
    salaryMaxEur !== null &&
    salaryMinEur > salaryMaxEur
  ) {
    throw new HttpError(400, "salaryMinEur must be less than or equal to salaryMaxEur");
  }
};

export const validateJobStatusFilter = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !jobStatuses.has(value)) {
    throw new HttpError(400, "status is not supported");
  }

  return value;
};

export const validateJobUserDecisionFilter = (value: unknown) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !userDecisions.has(value)) {
    throw new HttpError(400, "userDecision is not supported");
  }

  return value;
};

export const validateJobApplicationStatusFilter = (value: unknown) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !applicationStatuses.has(value)) {
    throw new HttpError(400, "applicationStatus is not supported");
  }

  return value;
};

export const validateJobCreate = (body: unknown): JobCreateData => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, createFields);

  const salaryMinEur = optionalPositiveInteger(body.salaryMinEur, "salaryMinEur");
  const salaryMaxEur = optionalPositiveInteger(body.salaryMaxEur, "salaryMaxEur");

  validateSalaryRange(salaryMinEur, salaryMaxEur);

  return {
    job: {
      company: requiredString(body.company, "company"),
      title: requiredString(body.title, "title"),
      location: optionalString(body.location, "location"),
      remoteType: optionalRemoteType(body.remoteType) ?? "unknown",
      salaryMinEur,
      salaryMaxEur,
      salaryText: optionalString(body.salaryText, "salaryText"),
      url: optionalUrl(body.url),
      externalSourceId: optionalString(body.externalSourceId, "externalSourceId")
    },
    description: readDescription(body)
  };
};

export const validateJobUpdate = (body: unknown): JobUpdateData => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, updateFields);

  const job: JobUpdateData["job"] = {};

  if ("company" in body) {
    job.company = requiredString(body.company, "company");
  }

  if ("title" in body) {
    job.title = requiredString(body.title, "title");
  }

  if ("location" in body) {
    job.location = optionalString(body.location, "location");
  }

  if ("remoteType" in body) {
    job.remoteType = optionalRemoteType(body.remoteType) ?? "unknown";
  }

  if ("salaryMinEur" in body) {
    job.salaryMinEur = optionalPositiveInteger(body.salaryMinEur, "salaryMinEur");
  }

  if ("salaryMaxEur" in body) {
    job.salaryMaxEur = optionalPositiveInteger(body.salaryMaxEur, "salaryMaxEur");
  }

  if ("salaryText" in body) {
    job.salaryText = optionalString(body.salaryText, "salaryText");
  }

  if ("url" in body) {
    job.url = optionalUrl(body.url);
  }

  if ("externalSourceId" in body) {
    job.externalSourceId = optionalString(body.externalSourceId, "externalSourceId");
  }

  if ("status" in body) {
    const status = optionalStatus(body.status);
    if (status) {
      job.status = status;
    }
  }

  if ("sourceQuality" in body) {
    const sourceQuality = optionalSourceQuality(body.sourceQuality);
    if (sourceQuality) {
      job.sourceQuality = sourceQuality;
    }
  }

  validateSalaryRange(job.salaryMinEur, job.salaryMaxEur);

  const description = readDescription(body);
  const hasDescriptionUpdate =
    "summaryText" in body ||
    "fullDescription" in body ||
    "rawSourceText" in body ||
    "language" in body;

  if ("fullDescription" in body && description.fullText && !("sourceQuality" in body)) {
    job.sourceQuality = "full_description";
  }

  return { job, description, hasDescriptionUpdate };
};

export const validateJobEnrichment = (body: unknown): JobEnrichmentData => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, enrichmentFields);

  const job: JobEnrichmentData["job"] = {};
  const description: JobDescriptionInput = {};
  let hasUsefulField = false;
  let hasDescriptionUpdate = false;
  let hasFullDescriptionUpdate = false;

  if ("url" in body) {
    job.url = optionalHttpUrl(body.url);
    hasUsefulField = true;
  }

  if ("fullDescription" in body) {
    const fullDescription = limitedString(body.fullDescription, "fullDescription", 100_000);
    description.fullText = fullDescription;
    description.rawSourceText = fullDescription;
    job.status = "ready_for_analysis";
    hasUsefulField = true;
    hasDescriptionUpdate = true;
    hasFullDescriptionUpdate = true;
  }

  if ("summaryText" in body) {
    description.summaryText = optionalLimitedString(body.summaryText, "summaryText", 10_000);
    hasUsefulField = true;
    hasDescriptionUpdate = true;
  }

  if ("language" in body) {
    description.language = optionalLimitedString(body.language, "language", 32);
    hasUsefulField = true;
    hasDescriptionUpdate = true;
  }

  if ("sourceQuality" in body) {
    const sourceQuality = optionalEnrichmentSourceQuality(body.sourceQuality);
    if (sourceQuality) {
      job.sourceQuality = sourceQuality;
      hasUsefulField = true;
    }
  }

  if (hasFullDescriptionUpdate && !job.sourceQuality) {
    job.sourceQuality = "full_description";
  }

  if (!hasUsefulField) {
    throw new HttpError(400, "At least one enrichment field must be provided");
  }

  return {
    job,
    description,
    hasDescriptionUpdate
  };
};

export const validateJobPipelineUpdate = (body: unknown): JobPipelineUpdateData => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, pipelineFields);

  const pipeline: JobPipelineUpdateData = {};

  if ("userDecision" in body) {
    pipeline.userDecision = optionalUserDecision(body.userDecision);
  }

  if ("applicationStatus" in body) {
    pipeline.applicationStatus = optionalApplicationStatus(body.applicationStatus);
  }

  if ("userNotes" in body) {
    pipeline.userNotes = optionalString(body.userNotes, "userNotes");
  }

  if ("nextAction" in body) {
    pipeline.nextAction = optionalString(body.nextAction, "nextAction");
  }

  if ("followUpDate" in body) {
    pipeline.followUpDate = optionalDate(body.followUpDate, "followUpDate");
  }

  if ("appliedAt" in body) {
    pipeline.appliedAt = optionalDate(body.appliedAt, "appliedAt");
  }

  if ("rejectedAt" in body) {
    pipeline.rejectedAt = optionalDate(body.rejectedAt, "rejectedAt");
  }

  return pipeline;
};

export const shouldCreateDescription = (description: JobDescriptionInput) =>
  hasDescriptionText(description);

export const serializeAiReview = (review: AiReview | null) =>
  review
    ? {
        ...review,
        createdAt: review.createdAt.toISOString()
      }
    : null;

export const serializeJob = (job: JobWithRelations) => {
  const { aiReviews, ...jobWithoutReviews } = job;

  return {
    ...jobWithoutReviews,
    importedAt: job.importedAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    archivedAt: job.archivedAt?.toISOString() ?? null,
    followUpDate: job.followUpDate?.toISOString() ?? null,
    appliedAt: job.appliedAt?.toISOString() ?? null,
    rejectedAt: job.rejectedAt?.toISOString() ?? null,
    source: job.source
      ? {
          ...job.source,
          createdAt: job.source.createdAt.toISOString(),
          updatedAt: job.source.updatedAt.toISOString()
        }
      : null,
    description: job.description
      ? {
          ...job.description,
          createdAt: job.description.createdAt.toISOString(),
          updatedAt: job.description.updatedAt.toISOString()
        }
      : null,
    latestAiReview: serializeAiReview(aiReviews?.[0] ?? null)
  };
};

export const hasFullDescription = (description: JobDescriptionInput) =>
  Boolean(description.fullText);
