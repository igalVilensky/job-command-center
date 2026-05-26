# Current State

This project is currently in the Milestone 03 candidate profile settings phase.

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
- `apps/web` Next.js app exists and displays "Job Command Center".
- `apps/api` Express placeholder exists with `GET /health`.
- `apps/ai-service` FastAPI placeholder exists with `GET /health`.
- Docker Compose Postgres exists with local `jobcc` credentials.
- `.env.example` exists with safe placeholders.
- Mock AI provider placeholder exists.
- Prisma is configured in `apps/api`.
- Initial Prisma models exist for `User` and `CandidateProfile`.
- Initial migration exists for the auth foundation.
- Seed script creates local demo user `demo@jobcc.local`.
- Basic email/password auth routes exist:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
- Passwords are hashed before storage.
- Auth uses an HTTP-only cookie/JWT session.
- Authenticated candidate profile routes exist:
  - `GET /profile`
  - `PUT /profile`
- `GET /profile` creates a default profile when missing.
- Profile updates validate allowed fields and are scoped to the authenticated user.
- `apps/web` has a minimal demo-login candidate profile editor.

Not implemented yet:

- job CRUD
- job inbox
- imports
- application pipeline
- real AI provider calls
- Gmail/OAuth/integrations
