import { Router } from "express";
import { DEFAULT_GMAIL_MAX_RESULTS, DEFAULT_GMAIL_QUERY, MAX_GMAIL_RESULTS } from "../lib/gmail-validation";
import { HttpError } from "../lib/http-error";
import {
  cancelJobAlertProcessingSession,
  getCurrentJobAlertProcessingSession,
  startJobAlertProcessingSession
} from "../lib/job-alert-processing-session";
import { asyncHandler } from "../middleware/async-handler";
import { type AuthenticatedRequest, requireAuth } from "../middleware/auth";

export const processingRouter = Router();

const startFields = new Set(["gmailQuery", "maxResults", "reviewDelaySeconds"]);

const getUserId = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  return req.user.id;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateStartBody = (body: unknown) => {
  if (body === undefined || body === null) {
    return {
      gmailQuery: DEFAULT_GMAIL_QUERY,
      maxResults: DEFAULT_GMAIL_MAX_RESULTS,
      reviewDelaySeconds: 60
    };
  }

  if (!isPlainObject(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const unknownFields = Object.keys(body).filter((field) => !startFields.has(field));
  if (unknownFields.length > 0) {
    throw new HttpError(400, `Unknown processing session fields: ${unknownFields.join(", ")}`);
  }

  const gmailQuery =
    typeof body.gmailQuery === "string" && body.gmailQuery.trim()
      ? body.gmailQuery.trim()
      : DEFAULT_GMAIL_QUERY;
  const maxResults = body.maxResults === undefined || body.maxResults === null ? DEFAULT_GMAIL_MAX_RESULTS : body.maxResults;
  const reviewDelaySeconds =
    body.reviewDelaySeconds === undefined || body.reviewDelaySeconds === null
      ? 60
      : body.reviewDelaySeconds;

  if (typeof maxResults !== "number" || !Number.isInteger(maxResults)) {
    throw new HttpError(400, "maxResults must be an integer");
  }

  if (maxResults < 1 || maxResults > MAX_GMAIL_RESULTS) {
    throw new HttpError(400, `maxResults must be between 1 and ${MAX_GMAIL_RESULTS}`);
  }

  if (typeof reviewDelaySeconds !== "number" || !Number.isInteger(reviewDelaySeconds)) {
    throw new HttpError(400, "reviewDelaySeconds must be an integer");
  }

  if (reviewDelaySeconds < 0 || reviewDelaySeconds > 3600) {
    throw new HttpError(400, "reviewDelaySeconds must be between 0 and 3600");
  }

  if (gmailQuery.length > 500) {
    throw new HttpError(400, "gmailQuery must be 500 characters or fewer");
  }

  return {
    gmailQuery,
    maxResults,
    reviewDelaySeconds
  };
};

processingRouter.post(
  "/job-alert-session/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const input = validateStartBody(req.body);

    try {
      const session = startJobAlertProcessingSession({ userId, ...input });

      res.status(202).json({ session });
    } catch (error) {
      if (error instanceof Error && /already running/i.test(error.message)) {
        throw new HttpError(409, error.message);
      }

      throw error;
    }
  })
);

processingRouter.get(
  "/job-alert-session/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);

    res.status(200).json({ session: getCurrentJobAlertProcessingSession(userId) });
  })
);

processingRouter.post(
  "/job-alert-session/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req as AuthenticatedRequest);

    res.status(200).json({ session: cancelJobAlertProcessingSession(userId) });
  })
);
