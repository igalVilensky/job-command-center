-- AlterTable
ALTER TABLE "CandidateProfile"
ADD COLUMN "salaryMinEur" INTEGER,
ADD COLUMN "salaryMaxEur" INTEGER,
ADD COLUMN "acceptableRemoteTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "locationNotes" TEXT,
ADD COLUMN "salaryNotes" TEXT;

-- Backfill salary range from the legacy single minimum where present.
UPDATE "CandidateProfile"
SET "salaryMinEur" = "minimumSalaryEur"
WHERE "salaryMinEur" IS NULL
  AND "minimumSalaryEur" IS NOT NULL;

-- Backfill acceptable remote modes from the legacy text field when it used a known mode.
UPDATE "CandidateProfile"
SET "acceptableRemoteTypes" = ARRAY["remotePreference"]::TEXT[]
WHERE "remotePreference" IN (
  'remote',
  'remote_first',
  'hybrid',
  'homeoffice_possible',
  'onsite',
  'unknown'
)
  AND cardinality("acceptableRemoteTypes") = 0;
