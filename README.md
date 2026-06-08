# Job Command Center

Job Command Center is an open-source, self-hosted, budget-aware command center for job search decisions.

It reduces job-search chaos by triaging job emails, identifying realistic opportunities, and telling the user the next useful action without auto-applying or wasting limited AI budget.

The project is designed as both a practical personal job search tool and a portfolio project demonstrating AI automation, agentic workflows, API integrations, and safe human-in-the-loop product design.

It is not intended to be a hosted SaaS where the maintainer pays for other people's storage or AI usage. Users clone it, run it locally or deploy it themselves, and use their own database and AI provider keys.

## Core principles

- Self-hosted-first.
- Local development should work with Docker Compose.
- Mock AI must work by default without external API keys.
- Hosted AI providers are optional and configured by the user.
- Local AI through Ollama should be supported after the MVP foundation.
- No API keys are ever exposed to the frontend.
- No automatic job applications.
- Human approval is required before applying or contacting employers.
- AI output is advisory, not authoritative.
- Rule-based triage should run before AI whenever it can reduce noise safely.
- AI extraction and AI review both consume scarce budget and must be capped.
- Email is an input source; opportunities, jobs, and next actions are the main work objects.
- Failed AI analysis must never destroy or block saved job data.
- The app should be useful even when AI is disabled.

## MVP features

1. Candidate profile and matching settings.
2. Manual job creation and pasted job/email import.
3. Job inbox with status filters.
4. AI extraction from pasted email/job text.
5. AI review against candidate profile.
6. Application pipeline tracking.
7. Mock AI provider.
8. Groq provider.
9. Automation run logs.
10. Optional manual Gmail import and clear docs for later Google Sheets, n8n, Make, and Ollama connectors.
11. Budget-aware job-alert processing session with deterministic prefiltering, capped AI extraction, capped AI review, and separate delays.
12. Command Queue as the main signed-in view, grouped by next action rather than raw data type.

## Tech stack

- Monorepo: pnpm workspaces + Turbo.
- Web: Next.js, React, TypeScript, Tailwind, shadcn/ui.
- API: Node.js, Express, TypeScript.
- Database: PostgreSQL + Prisma.
- AI service: Python, FastAPI, Pydantic, httpx.
- Local infrastructure: Docker Compose.
- AI providers: mock by default, Groq first, Gemini/Ollama/OpenAI-compatible later.

## App structure

```text
apps/
  web/          Next.js dashboard UI
  api/          Express API for auth, jobs, applications, settings, orchestration
  ai-service/   FastAPI service for AI extraction, review, and generation

docs/
  product/      Product scope, user flows, status model, build order
  architecture/ Runtime architecture, data model, integrations, security
  ai/           Provider contracts, schemas, prompt contracts, rate-limit rules
  codex/        Codex project brief, implementation rules, first milestone
```

## Current skeleton

The current repository state includes the runnable skeleton, database/auth foundation, candidate profile settings, manual job inbox, mock AI extraction/review foundation, optional Groq provider adapter, simulated email imports, manual Gmail OAuth import, and a budget-aware in-process job-alert processing session:

- `apps/web`: Next.js + TypeScript app on port 3000 with a Command Queue, candidate profile, paste import, Gmail/imports source history, job queue, job detail, AI review, and pipeline views.
- `apps/api`: Express + TypeScript API on port 4000 with `GET /health`, basic email/password auth, authenticated profile/job/import/Gmail/processing routes, and authenticated AI orchestration routes.
- `apps/ai-service`: FastAPI service on port 8001 with `GET /health`, `POST /extract-jobs`, `POST /review-job`, mock provider behavior by default, and opt-in Groq provider behavior.
- `docker-compose.yml`: local PostgreSQL service.
- `apps/api/prisma`: Prisma schema and migrations for `User`, `CandidateProfile`, `JobSource`, `Job`, `JobDescription`, `ImportedEmail`, `EmailAccount`, `AiReview`, and `AutomationRun`.

The job-alert processing session is stored in memory inside the API process. It continues if the browser tab closes, but it does not survive API server restart in the MVP.

By default, a processing session only processes the current Gmail query result batch. It does not load every old active imported email unless `includeBacklog` is explicitly set to `true`.

Gemini/Ollama/OpenAI providers, scheduled Gmail polling, scraping, browser extension, calendar, n8n, Make, and other external integrations are not implemented yet.

## Local setup

Install Node dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start Postgres:

```bash
docker compose up -d postgres
```

These commands assume local ports `3000`, `4000`, `8001`, and `5433` are free.

Prepare the API database:

```bash
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
```

The seed is idempotent for local development. It creates the demo user and demo CV source, creates a missing profile, updates an empty profile from the CV source, repairs the exact old local demo defaults, and skips any non-empty user-edited profile with a clear terminal message. To refresh structured CV-backed fields later, use **Save CV and update profile from CV** in the web UI.

Run the web app:

```bash
pnpm dev:web
```

Run the API:

```bash
pnpm dev:api
```

Set up and run the AI service:

```bash
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

After the Python virtual environment is activated, the equivalent root command is:

```bash
pnpm dev:ai
```

Useful checks:

```bash
curl http://localhost:4000/health
curl http://localhost:8001/health
```

The API health response includes non-secret AI debugging fields: `aiServiceUrl`, `aiEnabled`, and `nodeEnv`. Restart the API after changing `.env` so those values are reloaded.

To validate the deterministic prefilter logic locally:

```bash
pnpm --filter @jobcc/api test:prefilter
```

AI service checks:

```bash
curl -i \
  -H "Content-Type: application/json" \
  -d '{"sourceText":"Company: Example GmbH\nTitle: Backend Engineer\nLocation: Berlin\nRemote: hybrid\nBuild APIs with TypeScript and Node.js.","sourceType":"paste","sourceName":"Local paste"}' \
  http://127.0.0.1:8001/extract-jobs

curl -i \
  -H "Content-Type: application/json" \
  -d '{"candidateProfile":{"targetRoles":["Backend Engineer"],"strongSkills":["TypeScript","Node.js"],"minimumSalaryEur":70000},"job":{"company":"Example GmbH","title":"Backend Engineer","location":"Berlin","remoteType":"hybrid","salaryText":"70000 EUR","sourceQuality":"full_description"},"description":{"fullText":"Build APIs with TypeScript and Node.js."}}' \
  http://127.0.0.1:8001/review-job
```

Mock mode is the default and needs no AI key. To enable Groq locally, set placeholder values like these in your uncommitted `.env`, then restart the AI service:

```bash
AI_PROVIDER="groq"
GROQ_API_KEY="replace_with_your_local_key"
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
```

Never commit real API keys.

## Optional Gmail OAuth setup

Manual Gmail import is optional. To use it locally:

1. Create or select a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen for local testing.
4. Create OAuth client credentials for a web application.
5. Add this authorized redirect URI:

```text
http://127.0.0.1:4000/gmail/oauth/callback
```

Then set these values in your uncommitted `.env` and restart the API:

```bash
GOOGLE_CLIENT_ID="replace_with_local_client_id"
GOOGLE_CLIENT_SECRET="replace_with_local_client_secret"
GOOGLE_OAUTH_REDIRECT_URL="http://127.0.0.1:4000/gmail/oauth/callback"
EMAIL_TOKEN_ENCRYPTION_KEY="replace_me_with_32_byte_base64_or_long_secret"
```

Use a strong local `EMAIL_TOKEN_ENCRYPTION_KEY`. A 32-byte base64 value from `openssl rand -base64 32` works well.

Auth checks:

```bash
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"person@example.com","password":"password123"}' \
  http://127.0.0.1:4000/auth/register

curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/auth/me

curl -i -b /tmp/jobcc-cookies.txt -c /tmp/jobcc-cookies.txt \
  -X POST http://127.0.0.1:4000/auth/logout
```

Gmail checks:

```bash
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/gmail/status

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/gmail/oauth/start

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"query":"label:jobAlerts newer_than:30d","maxResults":10}' \
  http://127.0.0.1:4000/gmail/import/recent

curl -i -b /tmp/jobcc-cookies.txt \
  -X POST http://127.0.0.1:4000/gmail/disconnect
```

Job-alert processing session checks:

```bash
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"gmailQuery":"label:jobAlerts newer_than:30d","maxResults":5,"maxEmailsToProcess":3,"includeBacklog":false,"maxExtractionsPerRun":2,"maxReviewsPerRun":1,"extractionDelaySeconds":5,"reviewDelaySeconds":5}' \
  http://127.0.0.1:4000/processing/job-alert-session/start

curl -i -b /tmp/jobcc-cookies.txt \
  http://127.0.0.1:4000/processing/job-alert-session/current

curl -i -b /tmp/jobcc-cookies.txt \
  -X POST http://127.0.0.1:4000/processing/job-alert-session/cancel
```

The processing session imports Gmail job alerts, deterministically prefilters the current batch, skips obvious low-signal and duplicate sources without AI, extracts only eligible emails within the extraction budget, and reviews eligible full-description jobs within the review budget. Extraction and review are both sequential and delayed. Provider rate limits pause the relevant queue instead of failing every remaining item.

Browser smoke test for the command-center loop:

1. Sign in as `demo@jobcc.local`.
2. Open `Command Queue`.
3. Start `Sync and triage` with max results `5`, max emails `3`, max AI extractions `2`, max AI reviews `1`, extraction delay `5`, review delay `5`, and backlog unchecked.
4. Confirm the session says current batch only and does not process old backlog items.
5. Confirm extraction and review have separate queue/budget status.
6. Open `Imports` and check Active, Needs manual check, Paused by budget, Processed, Ignored / low signal, Hidden, and All filters.
7. Confirm ignored or duplicate sources show a reason and can still be restored or extracted manually.
8. Confirm Command Queue groups jobs and sources by next action.

Profile checks:

`POST /profile/cv` saves Typst/plain CV source and refreshes parsed CV-backed fields such as profession, bio, target roles, skills, language levels, and experience summary. It does not infer salary range, acceptable remote modes, preferred locations, avoid skills, or preference notes; edit those manually through `PUT /profile` or the profile form after CV extraction.

```bash
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/profile

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"typst","sourceName":"Local CV","sourceText":"Profession:\nFull-Stack Software Developer\n\nLanguages:\nEnglish C1\nGerman B2\n\nExperience highlights:\nBuilt TypeScript, React, Vue, Node.js, and AI product features in Leipzig, Germany."}' \
  http://127.0.0.1:4000/profile/cv

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X PUT \
  -d '{"targetRoles":["Frontend Developer","Full-Stack Software Developer"],"strongSkills":["TypeScript","React","Vue","Node.js"],"avoidSkills":["Cold calling"],"salaryMinEur":48000,"salaryMaxEur":55000,"acceptableRemoteTypes":["remote","remote_first","hybrid","homeoffice_possible","onsite"],"preferredLocations":["Leipzig","Remote","Germany"],"locationNotes":"Open to onsite or hybrid depending on city and context.","salaryNotes":"Target range is 48000-55000 EUR.","germanLevel":"B2","englishLevel":"C1","profileNotes":"Prefers product engineering roles."}' \
  http://127.0.0.1:4000/profile

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/profile
```

Job checks:

```bash
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"company":"Example GmbH","title":"Backend Engineer","location":"Berlin","remoteType":"hybrid","salaryText":"70000 EUR","url":"https://example.com/jobs/backend","fullDescription":"Build APIs with TypeScript."}' \
  http://127.0.0.1:4000/jobs

curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs/JOB_ID

curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X PUT \
  -d '{"location":"Remote","salaryMinEur":70000,"salaryMaxEur":85000}' \
  http://127.0.0.1:4000/jobs/JOB_ID

curl -i -b /tmp/jobcc-cookies.txt -X POST http://127.0.0.1:4000/jobs/JOB_ID/archive
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs
```

AI workflow checks:

```bash
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

The web app loads at `http://localhost:3000`.

## Runtime responsibility

- `apps/web` never calls AI providers directly.
- `apps/web` never sees AI provider keys.
- `apps/web` never sees Gmail/OAuth secrets.
- `apps/api` owns auth, persistence, and orchestration.
- `apps/api` calls `apps/ai-service` when AI is enabled.
- `apps/ai-service` is the only app that calls Groq, Gemini, Ollama, or other model providers.
- PostgreSQL is the system of record.

## Environment variables

Create `.env` from `.env.example`.

```bash
DATABASE_URL="postgresql://jobcc:jobcc@localhost:5433/jobcc_dev"

NODE_ENV="development"

WEB_URL="http://localhost:3000"
API_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:4000"

JWT_SECRET="replace_me_with_a_long_random_secret"
AUTH_COOKIE_NAME="jobcc_session"
JWT_EXPIRES_IN="7d"

AI_ENABLED="true"
AI_SERVICE_URL="http://127.0.0.1:8001"
AI_SERVICE_TOKEN=""

AI_PROVIDER="mock"

AI_EXTRACTION_MAX_SOURCE_CHARS="20000"
AI_REVIEW_MAX_DESCRIPTION_CHARS="4500"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"

GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"

OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1:8b"
```

Do not commit `.env`.

## Non-goals for MVP

- Hosted multi-tenant SaaS.
- Automatic job applications.
- Web scraping job boards.
- Required Gmail OAuth.
- Required paid AI provider.
- Browser extension.
- Mobile app.
- Full CRM complexity.
- Complex queue infrastructure before the basic workflow is proven.
