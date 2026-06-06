# Current State

This project is currently in the Milestone 15 visual design and status clarity phase.

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
- Candidate Profile separates CV-backed background facts from job-search preferences. Salary preferences are a range (`salaryMinEur`/`salaryMaxEur`), remote preference supports multiple acceptable modes, and location/salary notes are editable.
- Candidate profiles include richer editable CV-backed fields such as profession, bio, secondary/engineering/AI skills, languages JSON, and experience summary.
- Candidate CV source records can be stored as active `CandidateCv` rows through authenticated `/profile/cv` routes.
- `POST /profile/cv` stores Typst/plain CV source, performs lightweight deterministic profile extraction, updates the editable structured profile, and returns the active CV.
- CV extraction updates parsed CV-backed fields such as profession, bio, roles, skills, language levels, and experience summary. Salary range, acceptable remote modes, preferred locations, avoid skills, and preference notes are not inferred from CV source and remain manual profile fields.
- AI job review receives the richer structured profile and active CV context instead of relying only on shallow seed skills.
- Review prompting treats React/Angular/Next, Vue/Nuxt, TypeScript/JavaScript, Node/Express, REST APIs, testing/QA, CI/CD, and SaaS/product work as related JS/TS ecosystem skills when the profile supports that.
- Review prompting uses salary range overlap logic, so a job range such as 43000-66000 EUR is not below target for a 48000-55000 EUR candidate range.
- AI job reviews now include a structured fit breakdown for skills, salary, location/remote, language, seniority, and source quality.
- New AI reviews store the breakdown in `AiReview.fitBreakdownJson`; older reviews may not have this field populated and still render.
- The fit breakdown supports review debugging and user trust while the top-level score and decision remain the final recommendation.
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
  - `PATCH /jobs/:id/enrich`
  - `POST /jobs/:id/review`
  - `POST /jobs/:id/archive`
- Manual job detail enrichment lets the user paste the original job URL and full job description into an existing owned job. There is no scraping, auto-fetching, browser extension, cover-letter generation, or auto-apply behavior.
- Enrichment updates `Job.url`, upserts `JobDescription.fullText`, replaces `JobDescription.rawSourceText` with the pasted full description, can update language/source quality, and marks the job `ready_for_analysis` when a full description is supplied.
- Existing AI reviews are preserved after enrichment. The status change makes it clear that rerunning AI review is recommended, and the review route uses the enriched description and URL.
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
- `apps/web` has a minimal demo-login candidate profile editor, dashboard, combined imports view, scan-first jobs view, focused tabbed job detail view, manual job enrichment form, AI review action, and application pipeline editor.
- The web app primary navigation is now `Dashboard`, `Jobs`, `Imports`, and `Profile`.
- Milestone 14 adds a Dashboard as the default signed-in view. It summarizes jobs that need full descriptions, are ready for review, look like strong matches, need clarification, need pipeline follow-up, and the total active queue.
- Dashboard summary cards navigate into the Jobs view with a matching queue filter so the user can act on one category at a time.
- The Jobs view is now scan-first: filters/search, queue filter chips with counts, grouped queue sections, compact job rows, and row-level Open/Review/Enrich/Archive actions are shown without an inline detail editor.
- Job Queue supports quick triage from the queue: users can mark jobs Interested, Maybe, or Not interested through existing pipeline fields without opening Job Detail.
- Job Queue rows use action-aware primary buttons: Enrich for incomplete sources, Run review for review-ready jobs, and Open for reviewed jobs, with strong matches surfacing Interested as a prominent secondary action.
- Job Queue filters include all, needs description, ready for review, strong matches, maybe/clarify, interested, and not interested, with client-side counts.
- Opening a job switches to a focused route-like Job Detail view with Overview, AI Review, Description, Pipeline, and Enrichment tabs.
- Job Detail chooses a default tab based on the job state: AI Review when a review exists, Enrichment when the source is incomplete, and Overview otherwise.
- Secondary forms are progressively disclosed. Manual job creation is behind a `New job` action, paste extraction is behind `Paste job text`, simulated imports are under `Developer / simulated import`, and Gmail controls only show workflow-relevant connected/disconnected actions.
- The UX goal for Milestone 14 is lower cognitive load: queue pages support scanning and deciding what to open, while detail pages support working on one job at a time.
- AI review presentation now starts with the short recommendation text before deeper fit breakdown, risk flags, CV angle, and clarification questions.
- The app shell has a persistent signed-in navigation area, a top header with the account/sign-out controls, and a shared status/error area.
- Milestone 13 cleaned the AppShell/auth experience: signed-out users see a focused login card, while signed-in users see a compact account area with sign-out in the header.
- Global success and error messages now render in a consistent top alert area instead of appearing detached below the workspace.
- The Job Queue groups active jobs by action state, including needs full description, ready for AI review, reviewed apply/strong matches, reviewed maybe/clarify, in pipeline, and other active jobs.
- Job Detail separates enrichment, AI review, pipeline fields, and full description from queue triage so the long job list no longer competes with the selected job editor.
- Job Queue rows and Job Detail are visually cleaner, with a clearer selected job state, compact badges, primary actions near the top of detail, and less visual weight for secondary metadata.
- Manual job creation is secondary behind a collapsed `New manual job` section on the Job Queue.
- Secondary forms such as paste extraction, simulated email import, pipeline editing, long full descriptions, and full-description enrichment are progressively disclosed so the main workflow appears first.
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
- `apps/web` has an `Imports` inbox for processing imported job-alert emails into jobs.
- The Imports inbox filters imported emails client-side by all, not extracted, extracted, failed, and has jobs, with counts for each filter.
- The Imports inbox has a deterministic `Process next` workflow that selects the first not-yet-extracted email and focuses its detail panel without auto-extracting.
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
- The `Imports` view includes compact Gmail connection status, connect/disconnect actions, manual Gmail import controls, simulated import, paste extraction, the imported email inbox, and explicit email extraction.
- Gmail connection state is clearer in the web app: disconnected users see a single connect action and helper text, while connected users see account details, last import, a disconnect action, and the Gmail import form.
- Milestone 15 adds a calmer frontend visual design system with warmer neutral backgrounds, softer surfaces, softer borders, rounded controls, and quieter destructive actions.
- Status display now uses semantic badge tones for neutral, info, success, warning, danger, accent, and muted states instead of same-looking grey tags.
- Import, extraction, source quality, job status, next action, AI decision, and fit verdict states now map consistently to meaningful status colors.
- Imported email rows are more scannable: each row shows a status rail based on extraction state, subject-first hierarchy, sender/date metadata, muted preview text, a prominent extraction pill, and prioritized actions where only not-extracted or failed emails get primary Extract/Retry actions.
- Created/imported job lists now use the same compact job row style as the Job Queue, with title, company, source-quality badge, job-status badge, next-action badge, and an Open job action.
- Red is reserved for failed/destructive states, while success no longer acts as the whole-app accent.

Not implemented yet:

- Gemini/Ollama/OpenAI providers
- Gmail background polling or scheduled imports
