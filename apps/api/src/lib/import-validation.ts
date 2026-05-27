import type { ImportedEmail } from "@prisma/client";
import { HttpError } from "./http-error";

const simulateFields = new Set([
  "providerMessageId",
  "providerThreadId",
  "fromEmail",
  "fromName",
  "subject",
  "receivedAt",
  "sourceLabel",
  "snippet",
  "bodyText",
  "rawMetadataJson"
]);

const importStatuses = new Set(["imported"]);
const extractionStatuses = new Set(["not_started", "succeeded", "failed"]);

type ImportedEmailWithCount = ImportedEmail & {
  _count?: {
    jobs: number;
  };
};

export type ImportedEmailSimulateInput = {
  providerMessageId: string;
  providerThreadId?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  subject: string;
  receivedAt?: Date | null;
  sourceLabel?: string | null;
  snippet?: string | null;
  bodyText: string;
  rawMetadataJson?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rejectUnknownFields = (body: Record<string, unknown>, allowedFields: Set<string>) => {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown import fields: ${unknownFields.join(", ")}`);
  }
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

const optionalString = (value: unknown, field: string, maxLength?: number) => {
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

  if (maxLength && trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed ? trimmed : null;
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

const optionalJson = (body: Record<string, unknown>) => {
  if (!("rawMetadataJson" in body)) {
    return undefined;
  }

  return body.rawMetadataJson ?? null;
};

export const validateImportedEmailSimulate = (body: unknown): ImportedEmailSimulateInput => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, simulateFields);

  return {
    providerMessageId: requiredString(body.providerMessageId, "providerMessageId", 500),
    providerThreadId: optionalString(body.providerThreadId, "providerThreadId", 500),
    fromEmail: optionalString(body.fromEmail, "fromEmail", 500),
    fromName: optionalString(body.fromName, "fromName", 500),
    subject: requiredString(body.subject, "subject", 1000),
    receivedAt: optionalDate(body.receivedAt, "receivedAt"),
    sourceLabel: optionalString(body.sourceLabel, "sourceLabel", 500),
    snippet: optionalString(body.snippet, "snippet", 2000),
    bodyText: requiredString(body.bodyText, "bodyText"),
    rawMetadataJson: optionalJson(body)
  };
};

export const validateImportStatusFilter = (value: unknown) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !importStatuses.has(value)) {
    throw new HttpError(400, "importStatus is not supported");
  }

  return value;
};

export const validateExtractionStatusFilter = (value: unknown) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !extractionStatuses.has(value)) {
    throw new HttpError(400, "extractionStatus is not supported");
  }

  return value;
};

export const serializeImportedEmail = (email: ImportedEmailWithCount) => {
  const { _count, ...emailWithoutCount } = email;

  return {
    ...emailWithoutCount,
    receivedAt: email.receivedAt?.toISOString() ?? null,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
    jobCount: _count?.jobs ?? email.jobCount
  };
};
