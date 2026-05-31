import { Router } from "express";
import { parseCandidateCvSource } from "../lib/cv-profile";
import {
  serializeCandidateCv,
  serializeProfile,
  validateCandidateCvInput,
  validateProfileUpdate
} from "../lib/profile-validation";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { HttpError } from "../lib/http-error";

export const profileRouter = Router();

const getUserId = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  return req.user.id;
};

const activeCvForUser = (userId: string) =>
  prisma.candidateCv.findFirst({
    where: {
      userId,
      isActive: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

profileRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
    const activeCv = await activeCvForUser(userId);

    res.status(200).json({ profile: serializeProfile(profile, activeCv) });
  })
);

profileRouter.get(
  "/cv",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const activeCv = await activeCvForUser(userId);

    res.status(200).json({ cv: serializeCandidateCv(activeCv) });
  })
);

profileRouter.post(
  "/cv",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateCandidateCvInput(req.body);
    const parsedProfile = parseCandidateCvSource(input.sourceText);

    const result = await prisma.$transaction(async (tx) => {
      await tx.candidateCv.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      const cv = await tx.candidateCv.create({
        data: {
          userId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceText: input.sourceText,
          parsedProfileJson: parsedProfile
        }
      });

      const profile = await tx.candidateProfile.upsert({
        where: { userId },
        update: {
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
        },
        create: {
          userId,
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
        }
      });

      return { cv, profile };
    });

    res.status(201).json({
      profile: serializeProfile(result.profile, result.cv),
      cv: serializeCandidateCv(result.cv)
    });
  })
);

profileRouter.put(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const data = validateProfileUpdate(req.body);
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    const profile = existingProfile
      ? await prisma.candidateProfile.update({
          where: { userId },
          data
        })
      : await prisma.candidateProfile.create({
          data: {
            userId,
            ...data
          }
        });
    const activeCv = await activeCvForUser(userId);

    res.status(200).json({ profile: serializeProfile(profile, activeCv) });
  })
);
