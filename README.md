# Job Command Center

Self-hosted AI job search command center for tracking opportunities, triaging job alerts, reviewing fit against a candidate profile, and deciding the next useful action.

Job Command Center is a full-stack portfolio project built with Next.js, Express, PostgreSQL, Prisma, FastAPI, Docker Compose, and AI provider integrations. It turns messy job-search inputs into a structured command queue without auto-applying, exposing API keys, or wasting limited AI budget.

---

## Demo Status

This project is designed as a self-hosted, local-first tool.

A public hosted demo is not currently available because the app can use user-specific job data, authentication, Gmail OAuth, private database state, and private AI provider keys.

Screenshots will be added to show the main product flows.

```md
<!-- Screenshots will be added later -->

![Command Queue](./docs/screenshots/command-queue.png)
![Job Detail](./docs/screenshots/job-detail.png)
![AI Review](./docs/screenshots/ai-review.png)
![Candidate Profile](./docs/screenshots/profile.png)
![Imports](./docs/screenshots/imports.png)
![Pipeline](./docs/screenshots/pipeline.png)
```

---

## Overview

Job Command Center reduces job-search chaos by helping users organize opportunities, filter noisy job alerts, review realistic matches, and focus on the next useful action.

The app is not designed to automatically apply to jobs or contact employers. It supports the user with structured tracking, rule-based triage, optional AI extraction and review, budget controls, and human-in-the-loop decision-making.

It is also not intended to be a hosted SaaS where the maintainer pays for other people's storage or AI usage. Users clone it, run it locally or deploy it themselves, and use their own database and AI provider keys.

---

## Why I Built This

I built Job Command Center to solve a real problem in my own developer job search: job leads come from many places, many alerts are low quality, and it is easy to lose track of what deserves attention.

The project also demonstrates practical full-stack and AI automation skills:

- building a multi-app monorepo
- designing a job-search workflow around real user decisions
- integrating AI without giving it full control
- using deterministic filters before LLM calls
- keeping provider keys server-side
- tracking AI runs and budget limits
- supporting local-first/self-hosted usage

The goal is not “AI applies to jobs for me.” The goal is:

> Show me which opportunities deserve attention, why they may fit, and what I should do next.

---

## What This Project Demonstrates

- Full-stack monorepo architecture with Next.js, Express, FastAPI, PostgreSQL, and Prisma.
- AI-assisted workflow design with mock and hosted AI provider support.
- Human-in-the-loop product design for sensitive actions like job applications.
- Budget-aware AI orchestration with deterministic prefiltering before LLM usage.
- Authenticated job, profile, import, Gmail, and processing routes.
- Practical automation run logging and command-queue style UX.
- Local-first development with Docker Compose and self-hosted configuration.
- Separation between frontend, API, AI service, database, and provider integrations.

---

## Core Principles

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

---

## Features

### Command Queue

- Shows the main signed-in workspace.
- Groups jobs, sources, and opportunities by next useful action.
- Helps users focus on what needs review, follow-up, application, or manual checking.
- Avoids treating raw job data as the main product experience.

### Candidate Profile

- Stores candidate profile and matching settings.
- Supports CV-backed fields such as profession, bio, target roles, skills, language levels, and experience summary.
- Keeps preference fields editable manually, including salary expectations, remote preferences, preferred locations, avoid skills, and personal notes.

### Job Inbox

- Supports manual job creation.
- Supports pasted job or email import.
- Tracks job status and application pipeline state.
- Allows filtering and reviewing saved opportunities.

### AI Extraction

- Extracts structured job data from pasted text or imported email/job content.
- Works with mock AI by default.
- Supports optional Groq provider configuration.
- Keeps failed AI analysis separate from saved job data.

### AI Review

- Reviews jobs against the candidate profile.
- Helps identify realistic opportunities.
- Supports advisory fit review without making final decisions for the user.
- Keeps the user responsible for the final action.

### Budget-Aware Automation

- Runs deterministic prefiltering before AI usage.
- Skips obvious low-signal or duplicate sources without spending AI budget.
- Caps AI extraction and AI review per processing session.
- Supports separate extraction and review delays.
- Pauses provider-limited queues instead of failing every remaining item.

### Gmail Import

- Supports optional manual Gmail OAuth import.
- Imports job-alert emails from user-defined Gmail queries.
- Keeps Gmail integration optional for local/self-hosted use.

### Automation Runs

- Tracks processing sessions and automation activity.
- Supports debugging and reviewing what happened during job-alert processing.
- Makes the workflow more transparent.

---

## Tech Stack

### Monorepo

- pnpm workspaces
- Turbo

### Web App

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### API

- Node.js
- Express
- TypeScript
- Prisma

### AI Service

- Python
- FastAPI
- Pydantic
- httpx

### Database / Infrastructure

- PostgreSQL
- Docker Compose

### AI Providers

- Mock provider by default
- Groq provider
- Planned: Gemini, Ollama, OpenAI-compatible providers

---

## Architecture

```text
Next.js Web App
      |
      v
Express API
      |
      +--> PostgreSQL via Prisma
      |
      +--> Auth / Sessions
      |
      +--> Candidate Profile
      |
      +--> Job Inbox / Pipeline
      |
      +--> Gmail OAuth / Import
      |
      +--> Processing Sessions
      |
      +--> AI Orchestration
                |
                v
          FastAPI AI Service
                |
                +--> Mock Provider
                +--> Groq Provider
                +--> Future: Gemini / Ollama / OpenAI-compatible providers
```

The app separates the product UI, backend API, AI service, database, and provider integrations.

The frontend does not call AI providers directly. AI provider keys stay server-side.

---

## App Structure

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

---

## Current Project State

The current repository includes a runnable local skeleton with:

- Next.js dashboard UI.
- Express API.
- FastAPI AI service.
- PostgreSQL database with Prisma.
- Authentication foundation.
- Candidate profile settings.
- Manual job inbox.
- Pasted job/email import.
- Mock AI extraction and review.
- Optional Groq provider adapter.
- Simulated email imports.
- Manual Gmail OAuth import.
- Budget-aware in-process job-alert processing session.
- Automation run logs.
- Command Queue view grouped by next action.

The job-alert processing session is stored in memory inside the API process. It continues if the browser tab closes, but it does not survive an API server restart in the MVP.

By default, a processing session only processes the current Gmail query result batch. It does not load every old active imported email unless `includeBacklog` is explicitly set to `true`.

Gemini/Ollama/OpenAI providers, scheduled Gmail polling, scraping, browser extension, calendar, n8n, Make, and other external integrations are not implemented yet.

---

## Human-in-the-Loop Design

Job Command Center does not auto-apply to jobs or contact employers.

AI output is used for extraction, review, and prioritization, but the user stays responsible for every real-world action.

The system is designed to reduce noise and suggest next actions, not to make career decisions automatically.

This is especially important because job applications involve personal data, professional communication, and real consequences.

---

## AI and Budget Design

The project treats AI usage as useful but limited.

The workflow is designed around this principle:

```text
Use deterministic logic first.
Use AI only when it adds value.
Cap AI usage per processing session.
Keep the user in control.
```

The job-alert processing session can:

- import Gmail job alerts
- prefilter obvious low-signal emails
- skip duplicates without AI
- extract only eligible sources within the extraction budget
- review only eligible full-description jobs within the review budget
- delay extraction and review steps separately
- pause on provider rate limits

This makes the system more realistic than simply sending every email to an LLM.

---

## Local Setup

### Requirements

- Node.js `>=20`
- pnpm `>=9`
- Docker + Docker Compose
- Python 3
- PostgreSQL through Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a local environment file

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

These commands assume local ports `3000`, `4000`, `8001`, and `5433` are free.

### 4. Prepare the API database

```bash
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
```

The seed is idempotent for local development. It creates the demo user and demo CV source, creates a missing profile, updates an empty profile from the CV source, repairs the exact old local demo defaults, and skips any non-empty user-edited profile with a clear terminal message.

To refresh structured CV-backed fields later, use **Save CV and update profile from CV** in the web UI.

### 5. Run the web app

```bash
pnpm dev:web
```

The web app runs on:

```text
http://localhost:3000
```

### 6. Run the API

```bash
pnpm dev:api
```

The API runs on:

```text
http://localhost:4000
```

### 7. Set up and run the AI service

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

The AI service runs on:

```text
http://127.0.0.1:8001
```

---

## Useful Local Checks

### API health

```bash
curl http://localhost:4000/health
```

### AI service health

```bash
curl http://localhost:8001/health
```

The API health response includes non-secret AI debugging fields such as `aiServiceUrl`, `aiEnabled`, and `nodeEnv`.

Restart the API after changing `.env` so those values are reloaded.

### Deterministic prefilter test

```bash
pnpm --filter @jobcc/api test:prefilter
```

---

## AI Provider Configuration

Mock mode is the default and needs no AI key.

To enable Groq locally, set placeholder values like these in your uncommitted `.env`, then restart the AI service:

```bash
AI_PROVIDER="groq"
GROQ_API_KEY="replace_with_your_local_key"
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
```

Never commit real API keys.

---

## Optional Gmail OAuth Setup

Manual Gmail import is optional.

To use it locally:

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

Use a strong local `EMAIL_TOKEN_ENCRYPTION_KEY`.

A 32-byte base64 value from this command works well:

```bash
openssl rand -base64 32
```

---

## Browser Smoke Test

1. Sign in as `demo@jobcc.local`.
2. Open `Command Queue`.
3. Start `Sync and triage`.
4. Use a small test batch:
   - max results: `5`
   - max emails: `3`
   - max AI extractions: `2`
   - max AI reviews: `1`
   - extraction delay: `5`
   - review delay: `5`
   - backlog unchecked
5. Confirm the session says current batch only and does not process old backlog items.
6. Confirm extraction and review have separate queue/budget status.
7. Open `Imports`.
8. Check Active, Needs manual check, Paused by budget, Processed, Ignored / low signal, Hidden, and All filters.
9. Confirm ignored or duplicate sources show a reason and can still be restored or extracted manually.
10. Confirm Command Queue groups jobs and sources by next action.

---

## Available Scripts

### Root

```bash
pnpm dev
```

Runs the Turbo dev command.

```bash
pnpm build
```

Builds the monorepo with Turbo.

```bash
pnpm lint
```

Runs lint/type checks through Turbo.

### Web

```bash
pnpm dev:web
```

Runs the Next.js web app on port `3000`.

### API

```bash
pnpm dev:api
```

Runs the Express API on port `4000`.

### AI Service

```bash
pnpm dev:ai
```

Runs the AI service helper command.

---

## Environment Variables

Environment variables are read from `.env`.

Common local values include:

```bash
AI_PROVIDER="mock"
AI_SERVICE_URL="http://127.0.0.1:8001"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URL="http://127.0.0.1:4000/gmail/oauth/callback"
EMAIL_TOKEN_ENCRYPTION_KEY=""
```

Never commit real secrets.

---

## Testing and Quality Checks

Current useful checks:

```bash
pnpm lint
pnpm build
pnpm --filter @jobcc/api test:prefilter
```

Planned quality improvements:

- GitHub Actions CI for monorepo build and lint.
- Python AI service checks.
- Automated API tests.
- More tests for scoring, filtering, and processing-session logic.

---

## Suggested GitHub Actions CI

A recommended future workflow:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  node:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

---

## Documentation

The main README gives a high-level overview and local setup instructions.

More detailed docs can be split into:

```text
docs/
  local-development.md
  api-checks.md
  gmail-oauth.md
  architecture.md
  ai-providers.md
```

This keeps the README readable while preserving detailed technical notes.

---

## Security Notes

- API keys are never exposed to the frontend.
- Hosted AI providers are optional.
- Mock AI works by default.
- Gmail OAuth is optional and local/self-hosted.
- Real secrets should only be stored in local or deployment environment variables.
- AI output is advisory and should be reviewed by the user.
- The app does not auto-apply to jobs or contact employers.

---

## Future Improvements

- Add screenshots to the README.
- Add a short demo GIF.
- Add GitHub Actions CI for monorepo build and lint.
- Add Python AI service checks to CI.
- Move extended API curl checks into `docs/api-checks.md`.
- Add a public architecture diagram.
- Add more complete automated tests.
- Add Gemini provider support.
- Add Ollama local provider support.
- Add OpenAI-compatible provider support.
- Add scheduled Gmail polling.
- Add browser extension or scraping support.
- Add Google Sheets, n8n, and Make integrations.
- Persist processing sessions beyond API restarts.
- Add richer pipeline analytics.
- Add better application follow-up reminders.
- Add export/import support for job-search data.

---

## Repository Metadata

Suggested GitHub repository description:

```text
Self-hosted AI job search command center with Next.js, Express, PostgreSQL, FastAPI, Prisma, Gmail import, and budget-aware AI review.
```

Suggested topics:

```text
nextjs
react
typescript
express
postgresql
prisma
fastapi
python
docker-compose
ai-tools
llm
job-search
automation
human-in-the-loop
portfolio-project
```
