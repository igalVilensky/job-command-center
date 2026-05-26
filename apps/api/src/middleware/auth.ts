import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../lib/http-error";
import { prisma } from "../lib/prisma";
import { type SessionUser, verifySessionToken } from "../lib/session";

export type AuthenticatedRequest = Request & {
  user?: SessionUser;
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[env.authCookieName];

    if (!token || typeof token !== "string") {
      throw new HttpError(401, "Authentication required");
    }

    const sessionUser = verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      throw new HttpError(401, "Authentication required");
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};
