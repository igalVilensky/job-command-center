import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { healthRouter } from "./routes/health";

export const app = express();

app.use(
  cors({
    origin: env.webUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
