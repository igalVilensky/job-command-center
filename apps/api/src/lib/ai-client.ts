import { env } from "../config/env";

const MOCK_AI_MODEL = "mock-ai-v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export const EXTRACT_PROMPT_VERSION = "extract_jobs_v1";
export const REVIEW_PROMPT_VERSION = "review_job_v1";

const configuredProvider = () => process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";

export const getAiProviderMetadata = () => {
  const provider = configuredProvider();

  return {
    provider,
    model: provider === "groq" ? process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL : MOCK_AI_MODEL
  };
};

const stringifyDetail = (detail: unknown) => {
  if (typeof detail === "string") {
    return detail;
  }

  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  try {
    return JSON.stringify(detail) ?? String(detail);
  } catch {
    return String(detail);
  }
};

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
        ? stringifyDetail((payload as { detail?: unknown }).detail)
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
