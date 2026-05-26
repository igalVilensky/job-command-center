import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

const parsePort = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "jobcc_session",
  databaseUrl: process.env.DATABASE_URL,
  host: process.env.API_HOST ?? "127.0.0.1",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  jwtSecret:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev_only_replace_with_jwt_secret"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT ?? process.env.API_PORT, 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000"
};
