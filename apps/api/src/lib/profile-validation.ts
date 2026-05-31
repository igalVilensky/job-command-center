import { Prisma, type CandidateCv, type CandidateProfile } from "@prisma/client";
import { HttpError } from "./http-error";

const arrayFields = [
  "targetRoles",
  "strongSkills",
  "secondarySkills",
  "engineeringSkills",
  "aiSkills",
  "avoidSkills",
  "mixedSkills",
  "preferredLocations",
  "industryPreferences",
  "industryAvoid"
] as const;

const stringFields = [
  "profession",
  "bio",
  "remotePreference",
  "germanLevel",
  "englishLevel",
  "experienceSummary",
  "seniorityNotes",
  "profileNotes"
] as const;

const nullableFields = ["minimumSalaryEur", "availabilityDate"] as const;

const jsonFields = ["languagesJson"] as const;

const allowedFields = new Set<string>([
  ...arrayFields,
  ...stringFields,
  ...nullableFields,
  ...jsonFields
]);

export type ProfileUpdateData = Partial<{
  profession: string | null;
  bio: string | null;
  targetRoles: string[];
  strongSkills: string[];
  secondarySkills: string[];
  engineeringSkills: string[];
  aiSkills: string[];
  avoidSkills: string[];
  mixedSkills: string[];
  minimumSalaryEur: number | null;
  preferredLocations: string[];
  remotePreference: string | null;
  germanLevel: string | null;
  englishLevel: string | null;
  languagesJson: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  experienceSummary: string | null;
  seniorityNotes: string | null;
  industryPreferences: string[];
  industryAvoid: string[];
  availabilityDate: Date | null;
  profileNotes: string | null;
}>;

export type CandidateCvInput = {
  sourceType: string;
  sourceName: string | null;
  sourceText: string;
};

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

const normalizeJsonObject = (value: unknown, field: string) => {
  if (value === null) {
    return Prisma.JsonNull;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object or null`);
  }

  return value as Prisma.InputJsonObject;
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
  const dynamicData = data as Record<string, unknown>;

  for (const field of arrayFields) {
    if (field in body) {
      dynamicData[field] = normalizeStringArray(body[field], field);
    }
  }

  for (const field of stringFields) {
    if (field in body) {
      dynamicData[field] = normalizeString(body[field], field);
    }
  }

  for (const field of jsonFields) {
    if (field in body) {
      dynamicData[field] = normalizeJsonObject(body[field], field);
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

export const validateCandidateCvInput = (body: unknown): CandidateCvInput => {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const allowedCvFields = new Set(["sourceType", "sourceName", "sourceText"]);
  const unknownFields = Object.keys(body).filter((field) => !allowedCvFields.has(field));

  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown CV fields: ${unknownFields.join(", ")}`);
  }

  const sourceType = "sourceType" in body ? normalizeString(body.sourceType, "sourceType") : "typst";
  const sourceName = "sourceName" in body ? normalizeString(body.sourceName, "sourceName") : null;

  if (typeof body.sourceText !== "string" || !body.sourceText.trim()) {
    throw new HttpError(400, "sourceText is required");
  }

  if (body.sourceText.length > 200_000) {
    throw new HttpError(400, "sourceText must be 200000 characters or fewer");
  }

  return {
    sourceType: sourceType ?? "typst",
    sourceName,
    sourceText: body.sourceText.trim()
  };
};

export const serializeCandidateCvMetadata = (cv: CandidateCv | null) =>
  cv
    ? {
        id: cv.id,
        sourceType: cv.sourceType,
        sourceName: cv.sourceName,
        isActive: cv.isActive,
        createdAt: cv.createdAt.toISOString(),
        updatedAt: cv.updatedAt.toISOString()
      }
    : null;

export const serializeCandidateCv = (cv: CandidateCv | null) =>
  cv
    ? {
        ...serializeCandidateCvMetadata(cv),
        sourceText: cv.sourceText,
        parsedProfileJson: cv.parsedProfileJson
      }
    : null;

export const serializeProfile = (profile: CandidateProfile, activeCv: CandidateCv | null = null) => ({
  ...profile,
  availabilityDate: profile.availabilityDate?.toISOString() ?? null,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
  activeCv: serializeCandidateCvMetadata(activeCv)
});
