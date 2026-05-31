import { PrismaClient } from "@prisma/client";
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

  if (!existingProfile) {
    await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        ...profileData
      }
    });
  } else if (profileIsEmpty) {
    await prisma.candidateProfile.update({
      where: { userId: user.id },
      data: profileData
    });
  }

  console.log(`Seeded demo user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
