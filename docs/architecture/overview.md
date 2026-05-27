# Architecture Overview

Job Command Center uses a monorepo.

## apps/web

Next.js app.

Responsibilities:

- dashboard UI
- candidate profile settings UI
- job inbox UI
- job detail UI
- import/paste UI
- Gmail connection and manual import UI
- application pipeline UI
- calls `apps/api`
- never calls AI providers directly
- never sees AI provider keys

## apps/api

Node.js + Express + TypeScript API.

Responsibilities:

- authentication
- candidate profile CRUD
- job CRUD
- application CRUD
- import orchestration
- automation run logging
- AI-service orchestration
- database persistence
- API validation
- owner scoping

## apps/ai-service

Python + FastAPI service.

Responsibilities:

- extract jobs from pasted email/job text
- analyze job fit against candidate profile
- generate optional CV angle and next actions
- provider abstraction
- JSON validation and fallback
- mock provider
- Groq provider
- Ollama provider later

## Important principles

- Keep MVP simple.
- AI must be optional.
- Mock mode must be deterministic enough for tests.
- Failed AI analysis must never block job creation.
- Do not add queues until the basic workflow exists.
- Gmail OAuth import must remain explicit and user-triggered.
- Do not add Gmail background polling in MVP.
- Do not add scraping.
- Do not expose secrets to frontend.
- Do not auto-apply to jobs.
