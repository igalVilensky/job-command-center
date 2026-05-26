import { HttpError } from "./http-error";

const sourceKinds = new Set(["single_job", "multi_job_digest", "recruiter_message", "not_job_source"]);
const remoteTypes = new Set([
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite",
  "unknown"
]);
const sourceQualities = new Set(["full_description", "digest_summary", "email_summary", "unknown"]);
const confidenceValues = new Set(["high", "medium", "low"]);
const reviewDecisions = new Set(["apply", "maybe", "skip", "review_manually"]);

export type ExtractJobsBody = {
  sourceText: string;
  sourceType: string;
  sourceName: string | null;
};

export type AiExtractedJob = {
  company: string;
  title: string;
  location: string;
  remoteType: string;
  salaryText: string;
  salaryMinEur: number | null;
  salaryMaxEur: number | null;
  url: string;
  descriptionSummary: string;
  fullDescription: string;
  sourceQuality: string;
  needsFullDescription: boolean;
  confidence: string;
};

export type AiExtractionResponse = {
  sourceKind: string;
  jobs: AiExtractedJob[];
  warnings: string[];
};

export type AiReviewResponse = {
  score: number;
  decision: string;
  review: string;
  riskFlags: string[];
  cvAngle: string;
  clarificationQuestions: string[];
  confidence: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rejectUnknownFields = (body: Record<string, unknown>, allowedFields: Set<string>) => {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown fields: ${unknownFields.join(", ")}`);
  }
};

const optionalString = (value: unknown, field: string) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const requiredString = (value: unknown, field: string, maxLength?: number) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} is required`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
};

const optionalAiString = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new Error(`AI response ${field} must be a string`);
  }

  return value.trim();
};

const requiredAiString = (value: unknown, field: string) => {
  const stringValue = optionalAiString(value, field);
  if (!stringValue) {
    throw new Error(`AI response ${field} is required`);
  }

  return stringValue;
};

const aiStringArray = (value: unknown, field: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`AI response ${field} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
};

const aiNullablePositiveInteger = (value: unknown, field: string) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`AI response ${field} must be a positive integer or null`);
  }

  return value;
};

const aiEnum = (value: unknown, field: string, allowed: Set<string>) => {
  const stringValue = requiredAiString(value, field);
  if (!allowed.has(stringValue)) {
    throw new Error(`AI response ${field} is not supported`);
  }

  return stringValue;
};

const aiBoolean = (value: unknown, field: string) => {
  if (typeof value !== "boolean") {
    throw new Error(`AI response ${field} must be a boolean`);
  }

  return value;
};

const aiScore = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error("AI response score must be an integer between 0 and 100");
  }

  return value;
};

const validateAiUrl = (value: string) => {
  if (!value) {
    return value;
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new Error("AI response url must be a valid URL or an empty string");
  }
};

export const validateExtractJobsBody = (body: unknown): ExtractJobsBody => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, new Set(["sourceText", "sourceType", "sourceName"]));

  return {
    sourceText: requiredString(body.sourceText, "sourceText", 20000),
    sourceType: optionalString(body.sourceType, "sourceType") ?? "paste",
    sourceName: optionalString(body.sourceName, "sourceName")
  };
};

export const validateExtractionResponse = (body: unknown): AiExtractionResponse => {
  if (!isPlainObject(body)) {
    throw new Error("AI extraction response must be an object");
  }

  const sourceKind = aiEnum(body.sourceKind, "sourceKind", sourceKinds);
  const warnings = aiStringArray(body.warnings, "warnings");

  if (!Array.isArray(body.jobs)) {
    throw new Error("AI response jobs must be an array");
  }

  if (body.jobs.length === 0) {
    throw new Error("AI response must include at least one job");
  }

  const jobs = body.jobs.map((job, index) => {
    if (!isPlainObject(job)) {
      throw new Error(`AI response jobs[${index}] must be an object`);
    }

    const salaryMinEur = aiNullablePositiveInteger(job.salaryMinEur, `jobs[${index}].salaryMinEur`);
    const salaryMaxEur = aiNullablePositiveInteger(job.salaryMaxEur, `jobs[${index}].salaryMaxEur`);

    if (salaryMinEur !== null && salaryMaxEur !== null && salaryMinEur > salaryMaxEur) {
      throw new Error(`AI response jobs[${index}] has an invalid salary range`);
    }

    return {
      company: requiredAiString(job.company, `jobs[${index}].company`),
      title: requiredAiString(job.title, `jobs[${index}].title`),
      location: optionalAiString(job.location, `jobs[${index}].location`),
      remoteType: aiEnum(job.remoteType, `jobs[${index}].remoteType`, remoteTypes),
      salaryText: optionalAiString(job.salaryText, `jobs[${index}].salaryText`),
      salaryMinEur,
      salaryMaxEur,
      url: validateAiUrl(optionalAiString(job.url, `jobs[${index}].url`)),
      descriptionSummary: optionalAiString(job.descriptionSummary, `jobs[${index}].descriptionSummary`),
      fullDescription: optionalAiString(job.fullDescription, `jobs[${index}].fullDescription`),
      sourceQuality: aiEnum(job.sourceQuality, `jobs[${index}].sourceQuality`, sourceQualities),
      needsFullDescription: aiBoolean(job.needsFullDescription, `jobs[${index}].needsFullDescription`),
      confidence: aiEnum(job.confidence, `jobs[${index}].confidence`, confidenceValues)
    };
  });

  return {
    sourceKind,
    jobs,
    warnings
  };
};

export const validateReviewResponse = (body: unknown): AiReviewResponse => {
  if (!isPlainObject(body)) {
    throw new Error("AI review response must be an object");
  }

  return {
    score: aiScore(body.score),
    decision: aiEnum(body.decision, "decision", reviewDecisions),
    review: requiredAiString(body.review, "review"),
    riskFlags: aiStringArray(body.riskFlags, "riskFlags"),
    cvAngle: requiredAiString(body.cvAngle, "cvAngle"),
    clarificationQuestions: aiStringArray(body.clarificationQuestions, "clarificationQuestions"),
    confidence: aiEnum(body.confidence, "confidence", confidenceValues)
  };
};
