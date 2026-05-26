# Milestone 06: Groq AI Provider Adapter

## Goal

Add a real Groq provider to `apps/ai-service` while preserving the existing mock provider and keeping the same `/extract-jobs` and `/review-job` response contracts.

Mock mode remains the default and must continue to work without any external API key.

## Scope

- Add provider selection through `AI_PROVIDER`.
- Keep `AI_PROVIDER=mock` as the default.
- Add `AI_PROVIDER=groq` support inside `apps/ai-service`.
- Call Groq only from `apps/ai-service`.
- Reuse the existing AI service endpoint contracts:
  - `POST /extract-jobs`
  - `POST /review-job`
- Add compact prompt builders for extraction and review.
- Request JSON-only model output.
- Parse and validate model JSON before returning it to the API.
- Fail clearly on missing Groq config, network/API errors, invalid JSON, or malformed model output.
- Update docs and environment examples.

## Provider Config

Mock remains default:

```bash
AI_PROVIDER="mock"
```

Groq is enabled locally with:

```bash
AI_PROVIDER="groq"
GROQ_API_KEY="replace_with_your_local_key"
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
```

`GROQ_API_URL` is optional and defaults to the Groq OpenAI-compatible chat completions endpoint.

The AI service loads the root `.env` file for local development, matching the API service convention.

Optional prompt compaction limits:

```bash
AI_EXTRACTION_MAX_SOURCE_CHARS=20000
AI_REVIEW_MAX_DESCRIPTION_CHARS=4500
```

Never commit real API keys. Keep real `GROQ_API_KEY` values only in local `.env` files or deployment secrets.

## Prompt / JSON Contract Expectations

The Groq provider must build compact prompts that:

- instruct the model to return JSON only
- include the exact expected JSON shape
- include allowed enum values
- tell the model not to invent facts
- tell the model to use empty strings for unknown text fields
- tell the model to use `null` for unknown numeric salary values
- truncate large source text and descriptions before sending

Extraction output must match:

- `sourceKind`
- `jobs`
- `warnings`

Each extracted job must include:

- `company`
- `title`
- `location`
- `remoteType`
- `salaryText`
- `salaryMinEur`
- `salaryMaxEur`
- `url`
- `descriptionSummary`
- `fullDescription`
- `sourceQuality`
- `needsFullDescription`
- `confidence`

Review output must include:

- `score`
- `decision`
- `review`
- `riskFlags`
- `cvAngle`
- `clarificationQuestions`
- `confidence`

The AI service must normalize only safe fields such as whitespace and enum fallbacks where appropriate. It must not silently accept missing required top-level objects, missing job arrays, invalid JSON, or unsupported decision values.

## Error Handling

- `GET /health` should report the selected provider and readiness.
- If `AI_PROVIDER=groq` and `GROQ_API_KEY` is missing, health should report Groq as not ready.
- If Groq is not ready, extraction/review requests should fail with a structured HTTP error.
- Groq HTTP/network failures should produce clear exceptions.
- Invalid model JSON should produce clear exceptions.
- Malformed model output should produce clear exceptions.
- `apps/api` already records failed `AutomationRun` rows; preserve that behavior.
- Failed AI calls must not delete, archive, or hide jobs.

## Non-goals

- No Gemini provider.
- No Ollama provider.
- No OpenAI provider.
- No provider UI selector.
- No queues.
- No retries beyond simple safe handling.
- No Gmail/OAuth.
- No browser extension.
- No application pipeline.
- No auto-apply.
- No cover letters.

## Acceptance Criteria

- Mock mode still works with no Groq key.
- `AI_PROVIDER=groq` selects the Groq provider.
- Groq health reports provider name, configured model, API URL, and readiness without exposing the API key.
- Missing `GROQ_API_KEY` in Groq mode reports not ready and extraction/review requests fail with a structured error.
- Groq extraction calls the chat completions API and returns extraction-schema JSON.
- Groq review calls the chat completions API and returns review-schema JSON.
- Invalid JSON from Groq fails clearly instead of being saved.
- Existing API orchestration endpoints continue to work through the AI service.
- `apps/web` does not call Groq and does not contain Groq keys.
- No future milestone functionality is implemented.

## Local Test Commands

Mock mode:

```bash
AI_PROVIDER=mock pnpm dev:ai
curl http://127.0.0.1:8000/health
curl -i \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:8000/extract-jobs
```

Groq health without a key:

```bash
AI_PROVIDER=groq GROQ_API_KEY= pnpm dev:ai
curl http://127.0.0.1:8000/health
```

Groq mode with a local key:

```bash
AI_PROVIDER=groq \
GROQ_API_KEY="replace_with_your_local_key" \
GROQ_MODEL="llama-3.3-70b-versatile" \
pnpm dev:ai
```

Groq extraction:

```bash
curl -i \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:8000/extract-jobs
```

Groq review:

```bash
curl -i \
  -H "Content-Type: application/json" \
  -d '{"candidateProfile":{"targetRoles":["Backend Engineer"],"strongSkills":["TypeScript","Node.js"],"minimumSalaryEur":70000},"job":{"company":"Example GmbH","title":"Backend Engineer","location":"Berlin","remoteType":"hybrid","salaryText":"70000 EUR","sourceQuality":"full_description"},"description":{"fullText":"Build APIs with TypeScript and Node.js."}}' \
  http://127.0.0.1:8000/review-job
```

API flow through the AI service:

```bash
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
pnpm dev:api
pnpm dev:ai
pnpm dev:web

curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:4000/ai/extract-jobs

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X POST \
  http://127.0.0.1:4000/jobs/JOB_ID/review
```
