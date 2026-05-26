import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { HttpError } from "../lib/http-error";
import { hashPassword, verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { clearSessionCookie, setSessionCookie } from "../lib/session";

const MIN_PASSWORD_LENGTH = 8;

export const authRouter = Router();

type AuthBody = {
  email?: unknown;
  password?: unknown;
};

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizePassword = (value: unknown) => (typeof value === "string" ? value : "");

const validateCredentials = (body: AuthBody) => {
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);

  if (!email || !email.includes("@")) {
    throw new HttpError(400, "Valid email is required");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return { email, password };
};

const publicUser = (user: { id: string; email: string }) => ({
  id: user.id,
  email: user.email
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = validateCredentials(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new HttpError(409, "A user with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        candidateProfile: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    setSessionCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = validateCredentials(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    setSessionCookie(res, user);
    res.status(200).json({ user: publicUser(user) });
  })
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw new HttpError(401, "Authentication required");
    }

    res.status(200).json({ user: publicUser(authReq.user) });
  })
);
