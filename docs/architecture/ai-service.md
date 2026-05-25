# AI Service Architecture

The AI service is responsible for all model calls.

## Why separate service?

The AI service boundary keeps model logic, provider keys, prompt contracts, and provider-specific rate-limit handling away from the web app.

Responsibilities:

- web: UI only
- API: auth, persistence, orchestration
- AI service: model calls and response validation

## Endpoints

- `GET /health`
- `POST /extract-jobs`
- `POST /review-job`

Future:

- `POST /generate-cv-angle`
- `POST /generate-cover-letter`
- `POST /generate-follow-up`

## Providers

- mock by default
- Groq when configured
- Gemini later
- Ollama later
- OpenAI-compatible later

## Failure policy

AI failures must not delete jobs, overwrite existing good data, block manual job creation, or hide jobs from UI.

AI failures should create an AutomationRun with failed status and allow retry.
