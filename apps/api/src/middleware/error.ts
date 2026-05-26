import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { env } from "../config/env";

type HttpError = Error & {
  status?: number;
  statusCode?: number;
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error: HttpError = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler: ErrorRequestHandler = (error: HttpError, _req, res, _next) => {
  const statusCode = error.statusCode ?? error.status ?? 500;
  const message = statusCode >= 500 ? "Internal server error" : error.message;

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(env.nodeEnv !== "production" && error.stack ? { stack: error.stack } : {})
    }
  });
};
