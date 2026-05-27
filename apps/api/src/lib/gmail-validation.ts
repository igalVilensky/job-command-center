import { HttpError } from "./http-error";

const recentImportFields = new Set(["query", "maxResults"]);

export const DEFAULT_GMAIL_QUERY = "label:jobAlerts newer_than:30d";
export const DEFAULT_GMAIL_MAX_RESULTS = 10;
export const MAX_GMAIL_RESULTS = 25;

export type GmailRecentImportInput = {
  query: string;
  maxResults: number;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rejectUnknownFields = (body: Record<string, unknown>, allowedFields: Set<string>) => {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown Gmail import fields: ${unknownFields.join(", ")}`);
  }
};

const optionalString = (value: unknown, field: string, maxLength: number) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed || undefined;
};

const optionalMaxResults = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new HttpError(400, "maxResults must be an integer");
  }

  if (value < 1 || value > MAX_GMAIL_RESULTS) {
    throw new HttpError(400, `maxResults must be between 1 and ${MAX_GMAIL_RESULTS}`);
  }

  return value;
};

export const validateGmailRecentImport = (body: unknown): GmailRecentImportInput => {
  if (body === undefined || body === null) {
    return {
      query: DEFAULT_GMAIL_QUERY,
      maxResults: DEFAULT_GMAIL_MAX_RESULTS
    };
  }

  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  rejectUnknownFields(body, recentImportFields);

  return {
    query: optionalString(body.query, "query", 500) ?? DEFAULT_GMAIL_QUERY,
    maxResults: optionalMaxResults(body.maxResults) ?? DEFAULT_GMAIL_MAX_RESULTS
  };
};
