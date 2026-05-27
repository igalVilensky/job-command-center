import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const parsePort = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const normalizeString = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim();
  return normalized || fallback;
};

export const env = {
  aiEnabled: parseBool(process.env.AI_ENABLED, true),
  aiServiceUrl: normalizeString(process.env.AI_SERVICE_URL, "http://127.0.0.1:8001"),
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "jobcc_session",
  databaseUrl: process.env.DATABASE_URL,
  emailTokenEncryptionKey: process.env.EMAIL_TOKEN_ENCRYPTION_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOauthRedirectUrl:
    process.env.GOOGLE_OAUTH_REDIRECT_URL ?? "http://127.0.0.1:4000/gmail/oauth/callback",
  host: process.env.API_HOST ?? "127.0.0.1",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  jwtSecret:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev_only_replace_with_jwt_secret"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT ?? process.env.API_PORT, 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000"
};
