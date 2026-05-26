import { env } from "../config/env";

export const MOCK_AI_PROVIDER = "mock";
export const MOCK_AI_MODEL = "mock-ai-v1";
export const EXTRACT_PROMPT_VERSION = "extract_jobs_v1";
export const REVIEW_PROMPT_VERSION = "review_job_v1";

const postJson = async (path: string, body: unknown) => {
  const response = await fetch(`${env.aiServiceUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : `HTTP ${response.status}`;

    throw new Error(`AI service ${path} failed: ${detail}`);
  }

  return payload;
};

export const callExtractJobs = async (body: {
  sourceText: string;
  sourceType: string;
  sourceName: string | null;
}) => postJson("/extract-jobs", body);

export const callReviewJob = async (body: {
  candidateProfile: unknown;
  job: unknown;
  description: unknown;
}) => postJson("/review-job", body);
