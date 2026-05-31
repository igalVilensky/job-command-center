# Job Command Center

Job Command Center is an open-source, self-hosted AI job search automation dashboard.

It helps job seekers collect job opportunities from multiple sources, extract structured job data, analyze fit against an editable candidate profile, and track applications through a human-in-the-loop pipeline.

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

The current repository state includes the initial runnable skeleton, database/auth foundation, candidate profile settings, a manual job inbox, mock AI extraction/review foundation, an optional Groq provider adapter, simulated email imports, and manual Gmail OAuth import:

- `apps/web`: Next.js + TypeScript app on port 3000 with minimal authenticated candidate profile, paste import, Gmail/imports, job inbox, and AI review views.
- `apps/api`: Express + TypeScript API on port 4000 with `GET /health`, basic email/password auth, authenticated profile/job/import/Gmail routes, and authenticated AI orchestration routes.
- `apps/ai-service`: FastAPI service on port 8001 with `GET /health`, `POST /extract-jobs`, `POST /review-job`, mock provider behavior by default, and opt-in Groq provider behavior.
- `docker-compose.yml`: local PostgreSQL service.
- `apps/api/prisma`: Prisma schema and migrations for `User`, `CandidateProfile`, `JobSource`, `Job`, `JobDescription`, `ImportedEmail`, `EmailAccount`, `AiReview`, and `AutomationRun`.

Gemini/Ollama/OpenAI providers, Gmail background polling, scraping, browser extension, calendar, n8n, Make, and other external integrations are not implemented yet.

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

Profile checks:

`POST /profile/cv` saves Typst/plain CV source and refreshes parsed CV-backed fields such as profession, bio, target roles, skills, language levels, experience summary, and CV-detected locations. It does not infer salary expectations, avoid skills, or remote preference; edit those manually through `PUT /profile` or the profile form after CV extraction.

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
  -d '{"targetRoles":["Backend Engineer"],"strongSkills":["TypeScript","Node.js"],"avoidSkills":["Cold calling"],"minimumSalaryEur":70000,"preferredLocations":["Berlin","Remote"],"remotePreference":"hybrid","germanLevel":"B1","englishLevel":"C1","profileNotes":"Prefers product engineering roles."}' \
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
