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
  "digest_summary",
  "email_summary",
  "manual_note",
  "unknown"
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

const readDescription = (body: Record<string, unknown>) => ({
  summaryText: optionalString(body.summaryText, "summaryText"),
  fullText: optionalString(body.fullDescription, "fullDescription"),
  rawSourceText: optionalString(body.rawSourceText, "rawSourceText"),
  language: optionalString(body.language, "language")
});

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
