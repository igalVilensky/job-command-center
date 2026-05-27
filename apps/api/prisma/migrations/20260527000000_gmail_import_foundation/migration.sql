-- CreateTable
CREATE TABLE "ImportedEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "providerMessageId" TEXT NOT NULL,
    "providerThreadId" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "sourceLabel" TEXT,
    "snippet" TEXT,
    "bodyText" TEXT,
    "rawMetadataJson" JSONB,
    "importStatus" TEXT NOT NULL DEFAULT 'imported',
    "extractionStatus" TEXT NOT NULL DEFAULT 'not_started',
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedEmail_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "importedEmailId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ImportedEmail_userId_provider_providerMessageId_key" ON "ImportedEmail"("userId", "provider", "providerMessageId");

-- CreateIndex
CREATE INDEX "ImportedEmail_userId_receivedAt_idx" ON "ImportedEmail"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "ImportedEmail_userId_importStatus_idx" ON "ImportedEmail"("userId", "importStatus");

-- CreateIndex
CREATE INDEX "ImportedEmail_userId_extractionStatus_idx" ON "ImportedEmail"("userId", "extractionStatus");

-- CreateIndex
CREATE INDEX "Job_importedEmailId_idx" ON "Job"("importedEmailId");

-- AddForeignKey
ALTER TABLE "ImportedEmail" ADD CONSTRAINT "ImportedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_importedEmailId_fkey" FOREIGN KEY ("importedEmailId") REFERENCES "ImportedEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
