# Current State

This project is currently in the Milestone 09 Gmail OAuth connection and manual Gmail import phase.

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
- Optional Groq extraction and review are available when `AI_PROVIDER=groq`, `GROQ_API_KEY`, and `GROQ_MODEL` are configured locally.
- Prisma is configured in `apps/api`.
- Initial Prisma models exist for `User` and `CandidateProfile`.
- Initial migration exists for the auth foundation.
- Seed script creates local demo user `demo@jobcc.local`.
- Seed script creates the demo CV source, creates or fills an empty demo profile from the CV source, repairs the exact old local demo profile defaults, and logs clearly when an existing non-empty profile is skipped instead of overwritten.
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
- Candidate profiles include richer editable CV-backed fields such as profession, bio, secondary/engineering/AI skills, languages JSON, and experience summary.
- Candidate CV source records can be stored as active `CandidateCv` rows through authenticated `/profile/cv` routes.
- `POST /profile/cv` stores Typst/plain CV source, performs lightweight deterministic profile extraction, updates the editable structured profile, and returns the active CV.
- CV extraction updates parsed CV-backed fields such as profession, bio, roles, skills, language levels, experience summary, and CV-detected locations. Salary expectations, avoid skills, and remote preference are not inferred from CV source and remain manual profile fields.
- AI job review receives the richer structured profile and active CV context instead of relying only on shallow seed skills.
- Review prompting treats React/Next, Vue/Nuxt, TypeScript/JavaScript, Node/Express, REST APIs, and SaaS/product work as related JS/TS ecosystem skills when the profile supports that.
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
- Paste extraction creates an automation run, source, jobs, and descriptions from AI service output.
- Job review creates an automation run, stores an AI review, and updates the job status to `analyzed`.
- Job list excludes archived jobs by default.
- Job reads/writes are scoped to the authenticated user.
- Application pipeline fields exist on jobs for user decision, application status, notes, next action, follow-up date, applied date, and rejected date.
- Authenticated pipeline updates are available through `PATCH /jobs/:id/pipeline`.
- Pipeline updates are scoped to the authenticated user and validate allowed user decision/application status values.
- `appliedAt` and `rejectedAt` are auto-set when application status becomes `applied` or `rejected`.
- Failed AI calls are logged as failed `AutomationRun` rows and do not delete or hide saved jobs.
- `apps/web` has a minimal demo-login candidate profile editor, paste import view, job inbox, manual job creation form, AI review action, and application pipeline editor.
- Imported email Prisma models exist for simulated Gmail/job-alert messages.
- Jobs can optionally reference the imported email that produced them.
- Authenticated import routes exist:
  - `GET /imports/emails`
  - `POST /imports/emails/simulate`
  - `POST /imports/emails/:id/extract`
- Simulated imports deduplicate by user, provider, and provider message ID.
- Imported email listing, simulation, and extraction are scoped to the authenticated user.
- Imported email extraction reuses the existing API-to-AI-service extraction flow, creates jobs/descriptions, records an automation run, and updates email extraction status/job count.
- Imported email extraction now sends generic cleaned source text to the LLM instead of raw tracking-heavy email bodies.
- Imported email cleanup is provider-agnostic and removes common email noise such as long/tracking URLs, invisible padding, repeated CTAs, social links, and footer/legal text while preserving visible job content for LLM extraction.
- The LLM remains responsible for semantic job extraction; there is no provider-specific or StepStone-specific job parser.
- Zero-job extraction is valid, marks the imported email extraction as succeeded, and can return warnings for low-confidence sources.
- Re-running extraction for the same imported email skips duplicate jobs by normalized company/title and keeps the linked job count accurate.
- The web app surfaces safe backend error details for extraction failures.
- `apps/web` has a simple `Imports` view for simulating an imported email, viewing import history, and extracting jobs from a saved email.
- The Imports view now distinguishes imported emails from extracted jobs, shows not-yet-extracted emails as `Not extracted yet`, and marks processed emails with extracted-job status.
- Email account Prisma models exist for Gmail OAuth connections.
- Gmail OAuth tokens are stored through an encryption helper backed by `EMAIL_TOKEN_ENCRYPTION_KEY`.
- Authenticated Gmail routes exist:
  - `GET /gmail/status`
  - `GET /gmail/oauth/start`
  - `POST /gmail/disconnect`
  - `POST /gmail/import/recent`
- Gmail OAuth callback exists at:
  - `GET /gmail/oauth/callback`
- Gmail status returns safe account info only and never returns tokens.
- Manual Gmail import uses stored Gmail OAuth credentials to fetch recent messages, deduplicates them into `ImportedEmail`, and does not automatically extract jobs.
- The `Imports` view includes Gmail connection status, connect/disconnect actions, manual Gmail import controls, simulated import, import history, and explicit email extraction.

Not implemented yet:

- Gemini/Ollama/OpenAI providers
- Gmail background polling or scheduled imports
