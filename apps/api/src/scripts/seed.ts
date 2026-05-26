import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@jobcc.local";
const DEMO_PASSWORD = "password123";

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

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id
    }
  });

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
