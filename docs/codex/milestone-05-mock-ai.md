# Milestone 05: Mock AI Extraction + Review Foundation

## Goal

Create the internal AI workflow foundation using mock AI only.

The system should let an authenticated user paste job or email text, extract one or more saved jobs, then run a mock review for an owned job against the candidate profile. This milestone proves the orchestration, persistence, and UI loop without calling any external AI provider.

## Scope

- Add Prisma models for `AiReview` and `AutomationRun`.
- Add mock-only AI service endpoints for extraction and review.
- Add authenticated API orchestration endpoints.
- Persist extracted jobs, descriptions, AI reviews, and automation run logs.
- Validate AI responses before database writes.
- Keep all saved data scoped to the authenticated user.
- Extend the existing minimal web UI with paste import and review actions.
- Update README and current-state docs.

## Data Model Additions

### AiReview

- `id`
- `jobId`
- `job`
- `provider`
- `model`
- `promptVersion`
- `score`
- `decision`
- `reviewText`
- `riskFlags`
- `cvAngle`
- `clarificationQuestions`
- `rawResponseJson`
- `createdAt`

### AutomationRun

- `id`
- `userId`
- `user`
- `jobId` nullable
- `job` nullable
- `runType`
- `provider`
- `model`
- `status`
- `inputChars`
- `errorMessage`
- `startedAt`
- `finishedAt`
- `metadataJson`

Add `User.automationRuns`, `Job.aiReviews`, and `Job.automationRuns` relations as needed.

String arrays are acceptable for `riskFlags` and `clarificationQuestions`. JSON is acceptable for `rawResponseJson` and `metadataJson`.

## AI Service Endpoints

### `GET /health`

- Remains unchanged.
- Reports the configured provider and mock provider readiness.

### `POST /extract-jobs`

- Accepts:
  - `sourceText`
  - `sourceType`
  - `sourceName`
  - optional metadata
- Returns strict JSON matching `docs/ai/extraction-schema.md`.
- Uses deterministic mock behavior.
- Returns multiple jobs when the text has multiple job-like markers.
- Returns one job otherwise.
- Uses placeholder company/title when text lacks obvious values.
- Sets `sourceQuality` to `full_description` for long enough text, otherwise `digest_summary`.
- Sets `needsFullDescription` from `sourceQuality`.
- Does not call Groq, Gemini, Ollama, OpenAI, or any external provider.

### `POST /review-job`

- Accepts:
  - candidate profile
  - job fields
  - job description/source quality
- Returns strict JSON matching `docs/ai/review-schema.md`.
- Uses deterministic mock behavior.
- Scores from simple keyword overlap and source completeness.
- Uses one of:
  - `apply`
  - `maybe`
  - `skip`
  - `review_manually`
- Includes review text, risk flags, CV angle, and clarification questions.
- Does not call Groq, Gemini, Ollama, OpenAI, or any external provider.

## API Orchestration Endpoints

### `POST /ai/extract-jobs`

- Requires auth.
- Body:
  - `sourceText: string`
  - `sourceType?: string`
  - `sourceName?: string`
- Creates an `AutomationRun` with `runType=extract_jobs`.
- Calls the AI service `/extract-jobs`.
- Validates the response before saving.
- Creates one `JobSource` for the import.
- Creates `Job` records for extracted jobs.
- Creates `JobDescription` records when text is available.
- Returns created jobs.
- On error, stores a failed `AutomationRun` and returns a structured error.

### `POST /jobs/:id/review`

- Requires auth.
- Requires the job to belong to the authenticated user.
- Creates an `AutomationRun` with `runType=review_job`.
- Loads the candidate profile and job description.
- Calls the AI service `/review-job`.
- Validates the response before saving.
- Stores an `AiReview`.
- Updates the job status to `analyzed`.
- Returns the review and job.
- On error, stores a failed `AutomationRun` and returns a structured error.
- Does not delete, archive, or hide the job on failure.

## Web UI Expectations

- Keep the UI simple.
- Add an Import/Paste section.
- Include a textarea for pasted job/email text.
- Include an `Extract jobs` button.
- Show created jobs after extraction.
- Add a selected job detail button to run mock AI review.
- Show the latest AI review on job detail:
  - score
  - decision
  - review text
  - risk flags
  - CV angle
  - clarification questions
- `apps/web` calls `apps/api` only.
- Do not add shadcn/ui unless already present.

## Non-goals

- No Groq provider.
- No Gemini provider.
- No Ollama provider.
- No real model calls.
- No Gmail/OAuth.
- No CSV import.
- No browser extension.
- No application pipeline.
- No cover letter generation.
- No auto-apply.
- No scraping.

## Acceptance Criteria

- Prisma migration applies successfully.
- `AiReview` and `AutomationRun` are available through Prisma.
- AI service `GET /health` still works.
- AI service `POST /extract-jobs` returns extraction-schema JSON without external calls.
- AI service `POST /review-job` returns review-schema JSON without external calls.
- API `POST /ai/extract-jobs` requires auth.
- API extraction validates non-empty `sourceText`.
- API extraction creates an `AutomationRun`, `JobSource`, `Job`, and `JobDescription` records where available.
- API `POST /jobs/:id/review` requires auth and job ownership.
- API review creates an `AutomationRun`, stores `AiReview`, and sets the job status to `analyzed`.
- Failed AI calls create failed `AutomationRun` rows.
- Failed review does not delete, archive, or hide the job.
- Web UI can log in, paste text, extract jobs, open a job, run mock review, and show the latest review.
- No future milestone functionality is implemented.

## Local Test Commands

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
pnpm dev:api
pnpm dev:ai
pnpm dev:web
```

AI service checks:

```bash
curl http://127.0.0.1:8000/health
curl -i \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:8000/extract-jobs
curl -i \
  -H "Content-Type: application/json" \
  -d '{"candidateProfile":{"targetRoles":["Backend Engineer"],"strongSkills":["TypeScript","Node.js"],"minimumSalaryEur":70000},"job":{"company":"Example GmbH","title":"Backend Engineer","location":"Berlin","remoteType":"hybrid","salaryText":"70000 EUR","sourceQuality":"full_description"},"description":{"fullText":"Build APIs with TypeScript and Node.js."}}' \
  http://127.0.0.1:8000/review-job
```

API checks:

```bash
curl http://127.0.0.1:4000/health
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:4000/ai/extract-jobs
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X POST \
  http://127.0.0.1:4000/jobs/JOB_ID/review
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs/JOB_ID
```
