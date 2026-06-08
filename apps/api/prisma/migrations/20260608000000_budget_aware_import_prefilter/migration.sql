ALTER TABLE "ImportedEmail"
ADD COLUMN "prefilterDecision" TEXT,
ADD COLUMN "jobLikelihoodScore" INTEGER,
ADD COLUMN "prefilterJson" JSONB,
ADD COLUMN "lastProcessedAt" TIMESTAMP(3);

CREATE INDEX "ImportedEmail_userId_prefilterDecision_idx" ON "ImportedEmail"("userId", "prefilterDecision");
