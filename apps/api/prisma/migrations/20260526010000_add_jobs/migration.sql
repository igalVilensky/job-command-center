-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT,
    "externalId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "externalSourceId" TEXT,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "remoteType" TEXT NOT NULL DEFAULT 'unknown',
    "salaryMinEur" INTEGER,
    "salaryMaxEur" INTEGER,
    "salaryText" TEXT,
    "url" TEXT,
    "sourceQuality" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'imported',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "summaryText" TEXT,
    "fullText" TEXT,
    "rawSourceText" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSource_userId_idx" ON "JobSource"("userId");

-- CreateIndex
CREATE INDEX "Job_userId_archivedAt_idx" ON "Job"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");

-- CreateIndex
CREATE INDEX "Job_sourceId_idx" ON "Job"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JobDescription_jobId_key" ON "JobDescription"("jobId");

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
