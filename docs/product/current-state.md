# Current State

This project is currently in the Milestone 01 skeleton phase.

## Existing prototype

A Google Apps Script prototype exists outside this repository.

Prototype capabilities:

- imports StepStone job alert emails from Gmail
- uses AI to extract job records
- stores jobs in Google Sheets
- displays a lightweight Apps Script dashboard
- supports manual full-description paste
- uses Groq/Llama for job fit review after compacting prompts
- uses time-based Apps Script triggers for import/analysis

## Prototype lessons

- hardcoded rule-based digest parsing was brittle
- AI extraction works better for messy job alert emails
- provider rate limits require queue-like processing
- analysis should be human-in-the-loop
- status fields must be simple and consistent
- prompt input must be compact
- secrets must be stored outside code
- debugging needs structured run logs

## Current repo status

Milestone 01 project skeleton has been created.

- pnpm workspace and Turbo root configuration exist.
- `apps/web` Next.js placeholder exists and displays "Job Command Center".
- `apps/api` Express placeholder exists with `GET /health`.
- `apps/ai-service` FastAPI placeholder exists with `GET /health`.
- Docker Compose Postgres exists with local `jobcc` credentials.
- `.env.example` exists with safe placeholders.
- Mock AI provider placeholder exists.

Not implemented yet:

- auth
- Prisma/database models
- product features
- real AI provider calls
- Gmail/OAuth/integrations
