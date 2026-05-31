-- AlterTable
ALTER TABLE "CandidateProfile"
ADD COLUMN "profession" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "engineeringSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "aiSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "languagesJson" JSONB,
ADD COLUMN "experienceSummary" TEXT,
ADD COLUMN "profileSourceId" TEXT;

-- CreateTable
CREATE TABLE "CandidateCv" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'typst',
    "sourceName" TEXT,
    "sourceText" TEXT NOT NULL,
    "parsedProfileJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateCv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateCv_userId_isActive_idx" ON "CandidateCv"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "CandidateCv" ADD CONSTRAINT "CandidateCv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
