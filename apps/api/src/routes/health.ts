import { Router } from "express";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "api",
    nodeEnv: env.nodeEnv,
    aiEnabled: env.aiEnabled,
    aiServiceUrl: env.aiServiceUrl
  });
});
