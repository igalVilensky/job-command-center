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

const safeTargetUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.username = url.username ? "redacted" : "";
    url.password = url.password ? "redacted" : "";
    for (const key of ["access_token", "api_key", "key", "token"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, "redacted");
      }
    }
    return url.toString();
  } catch {
    return value;
  }
};

const aiServiceUrl = (path: string) => {
  const baseUrl = env.aiServiceUrl.endsWith("/") ? env.aiServiceUrl : `${env.aiServiceUrl}/`;
  return new URL(path.replace(/^\//, ""), baseUrl).toString();
};

const responsePayload = async (response: Response) => {
  const text = await response.text().catch(() => "");
  if (!text) {
    return { payload: null, text };
  }

  try {
    return { payload: JSON.parse(text) as unknown, text };
  } catch {
    return { payload: null, text };
  }
};

const postJson = async (path: string, body: unknown) => {
  const targetUrl = aiServiceUrl(path);
  const safeUrl = safeTargetUrl(targetUrl);
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`AI service request failed: target=${safeUrl} status=network_error detail=${detail}`);
  }

  const { payload, text } = await responsePayload(response);

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? stringifyDetail((payload as { detail?: unknown }).detail)
        : text || response.statusText || "empty response body";

    throw new Error(`AI service request failed: target=${safeUrl} status=${response.status} detail=${detail}`);
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
