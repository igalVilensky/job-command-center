import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { jobsRouter } from "./routes/jobs";
import { profileRouter } from "./routes/profile";

export const app = express();

app.use(
  cors({
    origin: env.webUrl,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/jobs", jobsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
