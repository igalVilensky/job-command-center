# Codex Project Brief

You are building Job Command Center.

Job Command Center is an open-source, self-hosted AI job search automation dashboard.

It helps users collect job opportunities, extract structured job data, analyze fit against an editable candidate profile, track applications, and use AI safely with human-in-the-loop controls.

## Required architecture

Use a monorepo:

```text
apps/web
apps/api
apps/ai-service
```

Recommended stack:

- pnpm workspaces
- Turbo
- Next.js + React + TypeScript for web
- Express + TypeScript for API
- Prisma + PostgreSQL for database
- FastAPI + Python for AI service
- Docker Compose for local Postgres

## Hard rules

- Do not expose AI provider keys to frontend.
- Do not call Groq/Gemini/Ollama from frontend.
- Web calls API only.
- API calls AI service.
- AI service calls providers.
- AI must be optional.
- Mock AI must work by default.
- Failed AI analysis must not block saving jobs.
- Do not implement auto-apply.
- Do not implement Gmail OAuth in MVP.
- Do not implement scraping in MVP.
- Keep MVP simple.

## First task

Implement only milestone 1: project skeleton.
