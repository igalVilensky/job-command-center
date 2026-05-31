import { type CandidateProfile, PrismaClient } from "@prisma/client";
import { parseCandidateCvSource } from "../lib/cv-profile";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@jobcc.local";
const DEMO_PASSWORD = "password123";
const DEMO_CV_SOURCE = `
Profession:
Full-Stack Software Developer

Bio:
Full-stack developer building SaaS products with TypeScript, Vue/Nuxt, React/Next and Node.js. Experience delivering production features end-to-end, including AI-assisted product workflows, testing, release support and iteration with product/design teams.

Tech Stack:
- TypeScript / JavaScript
- Vue / Nuxt
- React / Next
- React Native
- Node / Express
- Python / FastAPI
- SQL / NoSQL

Engineering:
- REST APIs
- Git
- Docker
- CI/CD
- Testing / QA
- Firebase
- AWS basics

AI:
- LLM API Integration
- Prompt Engineering
- AI Agents
- n8n / Make
- AI Product Features

Languages:
- Hebrew Native
- Russian Native
- English C1
- German B2

Experience highlights:
- Flowplace: built full-stack SaaS features using TypeScript, Vue/Nuxt, Node.js and REST APIs; integrated LLM APIs into product workflows; production features, testing, release support, product/design collaboration.
- LeanERA: Vue 3, Nuxt 3, TypeScript, React Native.
- ARI Motors: full-stack functionality, performance, SEO, responsive UX.
- WBS: AI Agents & Automations training.
`.trim();

const OLD_DEMO_PROFILE_NOTES = "Prefers product engineering roles.";

const normalizedList = (items: string[]) => items.map((item) => item.trim().toLowerCase()).sort();

const listMatches = (actual: string[], expected: string[]) => {
  const actualItems = normalizedList(actual);
  const expectedItems = normalizedList(expected);

  return actualItems.length === expectedItems.length && actualItems.every((item, index) => item === expectedItems[index]);
};

const isBlank = (value: string | null) => !value?.trim();

const isOldDemoProfile = (profile: CandidateProfile) =>
  listMatches(profile.targetRoles, ["Backend Engineer"]) &&
  listMatches(profile.strongSkills, ["TypeScript", "Node.js"]) &&
  listMatches(profile.preferredLocations, ["Berlin", "Remote"]) &&
  listMatches(profile.avoidSkills, ["Cold calling"]) &&
  profile.minimumSalaryEur === 70000 &&
  profile.germanLevel === "B1" &&
  profile.englishLevel === "C1" &&
  profile.remotePreference === "hybrid" &&
  profile.profileNotes === OLD_DEMO_PROFILE_NOTES &&
  isBlank(profile.profession) &&
  isBlank(profile.bio) &&
  profile.secondarySkills.length === 0 &&
  profile.engineeringSkills.length === 0 &&
  profile.aiSkills.length === 0 &&
  profile.mixedSkills.length === 0 &&
  profile.industryPreferences.length === 0 &&
  profile.industryAvoid.length === 0 &&
  isBlank(profile.experienceSummary) &&
  isBlank(profile.seniorityNotes) &&
  profile.languagesJson === null &&
  profile.profileSourceId === null &&
  profile.availabilityDate === null;

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      passwordHash
    },
    select: {
      id: true,
      email: true
    }
  });

  const parsedProfile = parseCandidateCvSource(DEMO_CV_SOURCE);
  const existingProfile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id }
  });
  const existingActiveCv = await prisma.candidateCv.findFirst({
    where: {
      userId: user.id,
      isActive: true
    }
  });

  const cv =
    existingActiveCv ??
    (await prisma.candidateCv.create({
      data: {
        userId: user.id,
        sourceType: "typst",
        sourceName: "Demo CV",
        sourceText: DEMO_CV_SOURCE,
        parsedProfileJson: parsedProfile
      }
    }));

  const profileIsEmpty =
    existingProfile &&
    !existingProfile.profession &&
    !existingProfile.bio &&
    existingProfile.targetRoles.length === 0 &&
    existingProfile.strongSkills.length === 0 &&
    !existingProfile.profileNotes;
  const profileData = {
    profession: parsedProfile.profession,
    bio: parsedProfile.bio,
    targetRoles: parsedProfile.targetRoles,
    strongSkills: parsedProfile.strongSkills,
    secondarySkills: parsedProfile.secondarySkills,
    engineeringSkills: parsedProfile.engineeringSkills,
    aiSkills: parsedProfile.aiSkills,
    preferredLocations: parsedProfile.preferredLocations,
    germanLevel: parsedProfile.germanLevel,
    englishLevel: parsedProfile.englishLevel,
    languagesJson: parsedProfile.languagesJson,
    experienceSummary: parsedProfile.experienceSummary,
    profileNotes: parsedProfile.profileNotes,
    profileSourceId: cv.id
  };
  let profileSeedResult: string;

  if (!existingProfile) {
    await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        ...profileData
      }
    });
    profileSeedResult = "Demo profile created from CV source.";
  } else if (profileIsEmpty) {
    await prisma.candidateProfile.update({
      where: { userId: user.id },
      data: profileData
    });
    profileSeedResult = "Demo profile was empty; seed updated it from CV source.";
  } else if (isOldDemoProfile(existingProfile)) {
    await prisma.candidateProfile.update({
      where: { userId: user.id },
      data: {
        ...profileData,
        avoidSkills: [],
        mixedSkills: [],
        minimumSalaryEur: null,
        remotePreference: null,
        seniorityNotes: null,
        industryPreferences: [],
        industryAvoid: [],
        availabilityDate: null
      }
    });
    profileSeedResult =
      "Demo profile matched old local demo defaults; seed repaired it from CV source and cleared stale manual-only defaults.";
  } else {
    profileSeedResult =
      "Demo profile already has data; seed did not overwrite it. Use Save CV and update profile from CV in the UI to refresh structured fields.";
  }

  console.log(`Seeded demo user: ${user.email}`);
  console.log(profileSeedResult);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
