# Milestone 08: Gmail Import Foundation

## Goal

Prepare Job Command Center for future Gmail/job-alert automation by adding a safe imported-email foundation and a simulated email import flow. This milestone stores email-like job alert messages, supports manual simulation from the web UI/API, and lets the user explicitly run extraction against a saved imported email.

No real Gmail connection is added in this milestone.

## Scope

- Add an `ImportedEmail` data model owned by a user.
- Link jobs back to the imported email that produced them when extraction is run from an import.
- Add authenticated `/imports` API routes for listing, simulating, deduplicating, and extracting saved imported emails.
- Extend the web app with a simple `Imports` view.
- Keep all reads and writes scoped to the authenticated user.
- Reuse the existing API-to-AI-service extraction flow.
- Record extraction automation runs when importing jobs from an email.

## Data Model Additions

Add `ImportedEmail`:

- `id`
- `userId`
- `user` relation
- `provider` string default `"gmail"`
- `providerMessageId` string
- `providerThreadId` nullable string
- `fromEmail` nullable string
- `fromName` nullable string
- `subject` string
- `receivedAt` nullable `DateTime`
- `sourceLabel` nullable string
- `snippet` nullable string
- `bodyText` nullable text
- `rawMetadataJson` nullable JSON
- `importStatus` string default `"imported"`
- `extractionStatus` string default `"not_started"`
- `jobCount` int default `0`
- `errorMessage` nullable text
- `jobs` relation
- `createdAt`
- `updatedAt`

Update `Job`:

- Add nullable `importedEmailId`.
- Add nullable `importedEmail` relation.

Indexes and constraints:

- Unique `(userId, provider, providerMessageId)`.
- Index `(userId, receivedAt)`.
- Index `(userId, importStatus)`.
- Index `(userId, extractionStatus)`.
- Index `Job.importedEmailId`.

## API Endpoints

All endpoints require authentication.

### `GET /imports/emails`

Returns imported emails for the current user, newest first.

Query filters:

- `importStatus`
- `extractionStatus`

Validation:

- Unsupported `importStatus` values return `400`.
- Unsupported `extractionStatus` values return `400`.

Response includes `jobCount`.

### `POST /imports/emails/simulate`

Creates a simulated imported email for the current user.

Request body:

- `providerMessageId` required non-empty string
- `providerThreadId` optional string or null
- `fromEmail` optional string or null
- `fromName` optional string or null
- `subject` required non-empty string
- `receivedAt` optional valid date string or null
- `sourceLabel` optional string or null
- `snippet` optional string or null
- `bodyText` required non-empty string
- `rawMetadataJson` optional JSON object/array/value or null

Behavior:

- Uses provider `"gmail"` for simulated imports.
- Deduplicates by current user, provider, and provider message ID.
- If a matching import already exists, returns the existing record with `duplicate: true`.
- If no matching import exists, creates an `ImportedEmail` and returns it with `duplicate: false`.
- Does not call AI automatically.

### `POST /imports/emails/:id/extract`

Extracts jobs from an imported email owned by the current user.

Behavior:

- Confirms the imported email belongs to the current user.
- Requires saved `bodyText`.
- Calls the existing AI extraction client from the API.
- Creates `JobSource`, `Job`, and `JobDescription` records from the AI response.
- Links created jobs to `ImportedEmail` through `importedEmailId`.
- Updates `ImportedEmail.extractionStatus` to `succeeded` or `failed`.
- Updates `ImportedEmail.jobCount`.
- Stores `ImportedEmail.errorMessage` on failure.
- Records an `AutomationRun` for the extraction.
- Returns created jobs and imported email status.
- Failed extraction must not delete the imported email.

## Web UI Expectations

Add a new primary navigation view:

- `Imports`

The `Imports` view should:

- Show a simulated email import form with:
  - provider message ID
  - from email/name
  - subject
  - received date
  - label
  - body text
- Submit to `POST /imports/emails/simulate`.
- Show import history from `GET /imports/emails`.
- Allow selecting an imported email.
- Show subject, snippet/body preview, statuses, and job count.
- Include an `Extract jobs from email` button.
- Refresh import history and Job Inbox after extraction.
- Show created jobs after extraction.

Keep the UI simple and consistent with the existing MVP dashboard. Do not add real Gmail login.

## Non-Goals

Do not implement:

- Google OAuth
- Gmail API calls
- background polling
- cron/scheduler
- browser extension
- real job board scraping
- email sending
- cover letters
- calendar/reminders
- n8n/Make integration
- auto-apply

## Acceptance Criteria

- Prisma migration applies successfully.
- Authenticated user can create a simulated imported email.
- Duplicate `providerMessageId` returns the existing import without creating a second one.
- Authenticated user can list only their own imported emails.
- Extraction from an imported email creates jobs.
- Created jobs are visible in Job Inbox.
- `ImportedEmail.extractionStatus` and `ImportedEmail.jobCount` update correctly.
- Web UI can simulate import and trigger extraction.
- Existing manual job creation, paste extraction, AI review, and pipeline tracking still work.

## Local Test Commands

Start Postgres:

```bash
docker compose up -d postgres
```

Prepare the API database:

```bash
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
```

Run services:

```bash
pnpm dev:api
pnpm dev:ai
pnpm dev:web
```

Run static checks:

```bash
pnpm --filter @jobcc/api lint
pnpm --filter @jobcc/web lint
```

Manual local flow:

1. Log in as `demo@jobcc.local` / `password123`.
2. Open the `Imports` view.
3. Simulate an email with job text.
4. Verify it appears in import history.
5. Extract jobs from the imported email.
6. Verify created jobs appear in Job Inbox.
7. Run AI review on an extracted job.
8. Update its pipeline status.
