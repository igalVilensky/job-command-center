import { Router } from "express";
import { validateProfileUpdate, serializeProfile } from "../lib/profile-validation";
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

    res.status(200).json({ profile: serializeProfile(profile) });
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

    res.status(200).json({ profile: serializeProfile(profile) });
  })
);
