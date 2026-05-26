# Current State

This project is currently in the Milestone 05 mock AI extraction and review phase.

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
- `apps/api` Express app exists with `GET /health`.
- `apps/ai-service` FastAPI service exists with `GET /health`, `POST /extract-jobs`, and `POST /review-job`.
- Docker Compose Postgres exists with local `jobcc` credentials.
- `.env.example` exists with safe placeholders.
- Mock AI extraction and review are implemented without external provider calls.
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
- Job inbox Prisma models exist:
  - `JobSource`
  - `Job`
  - `JobDescription`
- AI workflow Prisma models exist:
  - `AiReview`
  - `AutomationRun`
- Authenticated job routes exist:
  - `GET /jobs`
  - `POST /jobs`
  - `GET /jobs/:id`
  - `PUT /jobs/:id`
  - `POST /jobs/:id/review`
  - `POST /jobs/:id/archive`
- Authenticated AI orchestration routes exist:
  - `POST /ai/extract-jobs`
- Manual job creation creates a manual source and optional description.
- Paste extraction creates an automation run, source, jobs, and descriptions from mock AI output.
- Mock job review creates an automation run, stores an AI review, and updates the job status to `analyzed`.
- Job list excludes archived jobs by default.
- Job reads/writes are scoped to the authenticated user.
- Failed AI calls are logged as failed `AutomationRun` rows and do not delete or hide saved jobs.
- `apps/web` has a minimal demo-login candidate profile editor, paste import view, job inbox, manual job creation form, and mock review action.

Not implemented yet:

- application pipeline
- real AI provider calls
- Gmail/OAuth/integrations
