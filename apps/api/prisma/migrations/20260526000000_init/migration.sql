-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "strongSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "secondarySkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "avoidSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "mixedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "minimumSalaryEur" INTEGER,
    "preferredLocations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "remotePreference" TEXT,
    "germanLevel" TEXT,
    "englishLevel" TEXT,
    "seniorityNotes" TEXT,
    "industryPreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "industryAvoid" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "availabilityDate" TIMESTAMP(3),
    "profileNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
