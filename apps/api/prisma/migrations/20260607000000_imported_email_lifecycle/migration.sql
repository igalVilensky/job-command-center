ALTER TABLE "ImportedEmail"
ADD COLUMN "inboxStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "processedAt" TIMESTAMP(3),
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "triageReason" TEXT;

CREATE INDEX "ImportedEmail_userId_inboxStatus_idx" ON "ImportedEmail"("userId", "inboxStatus");
