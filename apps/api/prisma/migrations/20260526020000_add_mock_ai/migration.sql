-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "reviewText" TEXT NOT NULL,
    "riskFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cvAngle" TEXT NOT NULL,
    "clarificationQuestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rawResponseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "runType" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "inputChars" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "metadataJson" JSONB,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReview_jobId_createdAt_idx" ON "AiReview"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationRun_userId_startedAt_idx" ON "AutomationRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationRun_jobId_idx" ON "AutomationRun"("jobId");

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
