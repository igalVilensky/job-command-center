-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "userDecision" TEXT DEFAULT 'undecided',
ADD COLUMN "applicationStatus" TEXT DEFAULT 'not_started',
ADD COLUMN "userNotes" TEXT,
ADD COLUMN "nextAction" TEXT,
ADD COLUMN "followUpDate" TIMESTAMP(3),
ADD COLUMN "appliedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Job_userId_applicationStatus_idx" ON "Job"("userId", "applicationStatus");

-- CreateIndex
CREATE INDEX "Job_userId_userDecision_idx" ON "Job"("userId", "userDecision");
