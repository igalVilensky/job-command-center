-- AlterTable
ALTER TABLE "AiReview"
ADD COLUMN IF NOT EXISTS "fitBreakdownJson" JSONB;
