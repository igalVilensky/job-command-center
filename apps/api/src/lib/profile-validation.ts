import type { CandidateProfile } from "@prisma/client";
import { HttpError } from "./http-error";

const arrayFields = [
  "targetRoles",
  "strongSkills",
  "secondarySkills",
  "avoidSkills",
  "mixedSkills",
  "preferredLocations",
  "industryPreferences",
  "industryAvoid"
] as const;

const stringFields = [
  "remotePreference",
  "germanLevel",
  "englishLevel",
  "seniorityNotes",
  "profileNotes"
] as const;

const nullableFields = ["minimumSalaryEur", "availabilityDate"] as const;

const allowedFields = new Set<string>([...arrayFields, ...stringFields, ...nullableFields]);

export type ProfileUpdateData = Partial<
  Pick<
    CandidateProfile,
    | "targetRoles"
    | "strongSkills"
    | "secondarySkills"
    | "avoidSkills"
    | "mixedSkills"
    | "minimumSalaryEur"
    | "preferredLocations"
    | "remotePreference"
    | "germanLevel"
    | "englishLevel"
    | "seniorityNotes"
    | "industryPreferences"
    | "industryAvoid"
    | "availabilityDate"
    | "profileNotes"
  >
>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown, field: string) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string or null`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeStringArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an array of strings`);
  }

  return value
    .map((item) => {
      if (typeof item !== "string") {
        throw new HttpError(400, `${field} must be an array of strings`);
      }

      return item.trim();
    })
    .filter((item) => item.length > 0);
};

const normalizeMinimumSalary = (value: unknown) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "minimumSalaryEur must be a positive integer or null");
  }

  return value;
};

const normalizeAvailabilityDate = (value: unknown) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "availabilityDate must be a valid date string or null");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "availabilityDate must be a valid date string or null");
  }

  return date;
};

export const validateProfileUpdate = (body: unknown): ProfileUpdateData => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown profile fields: ${unknownFields.join(", ")}`);
  }

  const data: ProfileUpdateData = {};

  for (const field of arrayFields) {
    if (field in body) {
      data[field] = normalizeStringArray(body[field], field);
    }
  }

  for (const field of stringFields) {
    if (field in body) {
      data[field] = normalizeString(body[field], field);
    }
  }

  if ("minimumSalaryEur" in body) {
    data.minimumSalaryEur = normalizeMinimumSalary(body.minimumSalaryEur);
  }

  if ("availabilityDate" in body) {
    data.availabilityDate = normalizeAvailabilityDate(body.availabilityDate);
  }

  return data;
};

export const serializeProfile = (profile: CandidateProfile) => ({
  ...profile,
  availabilityDate: profile.availabilityDate?.toISOString() ?? null,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString()
});
