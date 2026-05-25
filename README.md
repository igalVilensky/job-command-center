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
10. Clear docs for later Gmail, Google Sheets, n8n, Make, and Ollama connectors.

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
DATABASE_URL="postgresql://jobcc:jobcc@localhost:5432/jobcc_dev"

NODE_ENV="development"

WEB_URL="http://localhost:3000"
API_URL="http://localhost:4000"
NEXT_PUBLIC_API_URL="http://localhost:4000"

JWT_SECRET="replace_me_with_a_long_random_secret"

AI_ENABLED="true"
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_TOKEN=""

AI_PROVIDER="mock"

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
