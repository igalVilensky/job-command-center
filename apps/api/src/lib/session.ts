import type { Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "./http-error";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
};

type SessionPayload = {
  sub: string;
  email: string;
};

const cookieOptions = {
  httpOnly: true,
  maxAge: SESSION_MAX_AGE_MS,
  sameSite: "lax" as const,
  secure: env.nodeEnv === "production"
};

const requireJwtSecret = () => {
  if (!env.jwtSecret) {
    throw new HttpError(500, "JWT secret is not configured");
  }

  return env.jwtSecret;
};

export const signSessionToken = (user: SessionUser) => {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email
  };

  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, requireJwtSecret(), options);
};

export const verifySessionToken = (token: string): SessionUser => {
  try {
    const payload = jwt.verify(token, requireJwtSecret()) as SessionPayload;

    if (!payload.sub || !payload.email) {
      throw new HttpError(401, "Invalid session");
    }

    return {
      id: payload.sub,
      email: payload.email
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, "Invalid session");
  }
};

export const setSessionCookie = (res: Response, user: SessionUser) => {
  res.cookie(env.authCookieName, signSessionToken(user), cookieOptions);
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(env.authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production"
  });
};
