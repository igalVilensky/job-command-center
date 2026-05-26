# Milestone 07: Application Pipeline

## Goal

Allow an authenticated user to track their own decision and application progress after a job has been imported, manually created, or AI-reviewed.

## Scope

- Add simple pipeline/application fields to jobs.
- Add an authenticated API endpoint for updating only those fields.
- Show and edit pipeline fields in the existing Job Inbox detail view.
- Add basic filtering and badges so jobs can be scanned by user decision or application status.
- Keep existing manual creation, paste import, mock AI, and Groq review flows working.

## Data Model Additions

Add nullable fields directly to `Job`:

- `userDecision` string, default `undecided`
- `applicationStatus` string, default `not_started`
- `userNotes` text
- `nextAction` text
- `followUpDate` DateTime
- `appliedAt` DateTime
- `rejectedAt` DateTime

Allowed `userDecision` values:

```text
undecided
interested
maybe
not_interested
applied
rejected
interviewing
offer
archived
```

Allowed `applicationStatus` values:

```text
not_started
preparing
applied
follow_up_needed
interviewing
rejected
offer
accepted
declined
```

No activity history model is included in this milestone.

## API Endpoints

Extend authenticated `/jobs` responses:

- `GET /jobs` includes pipeline fields.
- `GET /jobs/:id` includes pipeline fields.

Add:

```text
PATCH /jobs/:id/pipeline
```

Rules:

- Requires authentication.
- The job must belong to the authenticated user.
- Accepts only pipeline/application fields.
- Validates `userDecision` and `applicationStatus` against allowed values.
- Validates `followUpDate`, `appliedAt`, and `rejectedAt` as `null` or valid dates.
- Sets `appliedAt` automatically when `applicationStatus` becomes `applied` and no applied date exists.
- Sets `rejectedAt` automatically when `applicationStatus` becomes `rejected` and no rejected date exists.
- Returns the updated serialized job.

## Web UI Expectations

Extend the existing Job Inbox detail view with an Application Pipeline section:

- user decision select
- application status select
- user notes textarea
- next action textarea
- follow-up date input
- save pipeline button

Also show simple status badges in the job list and allow filtering by user decision or application status.

## Non-Goals

Do not implement:

- Gmail/OAuth
- email sending
- calendar integration
- reminders or notifications
- cover letter generation
- auto-apply
- browser extension
- scraping
- queues
- external automation
- application activity history

## Acceptance Criteria

- Migration applies successfully.
- Authenticated users can update pipeline fields for owned jobs.
- Unauthenticated pipeline updates are rejected.
- A user cannot update another user’s job.
- `applicationStatus` and `userDecision` values are validated.
- `appliedAt` is auto-set when status becomes `applied`.
- `rejectedAt` is auto-set when status becomes `rejected`.
- Web UI can save and display pipeline fields.
- Existing job create, import, and review flows still work.

## Local Test Commands

```bash
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
pnpm dev:api
pnpm dev:web
```

Manual flow:

1. Open `http://localhost:3000`.
2. Sign in as `demo@jobcc.local` / `password123`.
3. Create or import a job.
4. Open the job in Job Inbox.
5. Set decision, application status, notes, next action, and follow-up date.
6. Save the pipeline.
7. Refresh and confirm values persist.
