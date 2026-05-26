import dotenv from "dotenv";

dotenv.config();

const parsePort = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  host: process.env.API_HOST ?? "127.0.0.1",
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT ?? process.env.API_PORT, 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000"
};
