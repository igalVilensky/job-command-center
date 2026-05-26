# Milestone 04: Job Inbox + Manual Job Creation

## Goal

Allow an authenticated user to manually create job opportunities, list their active jobs, view one job, update basic job fields, and archive jobs.

This milestone creates the first job inbox loop. It does not add AI extraction, AI review, imports, or application pipeline behavior.

## Scope

- Add `JobSource`, `Job`, and `JobDescription` models to Prisma.
- Add a migration for the new job tables.
- Add authenticated `/jobs` API routes.
- Validate manual job input.
- Scope all job reads/writes to the authenticated user.
- Add a minimal web job inbox alongside the existing candidate profile UI.
- Update README and current-state docs.

## Data Model Additions

### JobSource

- `id`
- `userId`
- `user`
- `sourceType`
- `sourceName`
- `externalId`
- `metadataJson`
- `createdAt`
- `updatedAt`

### Job

- `id`
- `userId`
- `user`
- `sourceId`
- `source`
- `externalSourceId`
- `company`
- `title`
- `location`
- `remoteType`
- `salaryMinEur`
- `salaryMaxEur`
- `salaryText`
- `url`
- `sourceQuality`
- `status`
- `importedAt`
- `createdAt`
- `updatedAt`
- `archivedAt`

### JobDescription

- `id`
- `jobId`
- `job`
- `summaryText`
- `fullText`
- `rawSourceText`
- `language`
- `createdAt`
- `updatedAt`

Strings are acceptable for status/source fields in this milestone as long as API validation uses the documented status model values.

## API Endpoints

### `GET /jobs`

- Requires auth.
- Returns jobs owned by the authenticated user.
- Excludes archived jobs by default.
- Supports `status`.
- Supports `includeArchived=true`.

### `POST /jobs`

- Requires auth.
- Creates a manual job.
- Creates a manual `JobSource`.
- Creates `JobDescription` when description text is provided.
- Defaults `status` to `ready_for_analysis` when `fullDescription` is provided, otherwise `imported`.
- Defaults `sourceQuality` to `full_description` when `fullDescription` is provided, otherwise `manual_note`.

### `GET /jobs/:id`

- Requires auth.
- Returns one job owned by the authenticated user with its description.
- Returns 404 if the job is missing or owned by another user.

### `PUT /jobs/:id`

- Requires auth.
- Updates allowed basic fields and description fields.
- Cannot change `userId`.
- Cannot update future AI fields.

### `POST /jobs/:id/archive`

- Requires auth.
- Sets `archivedAt`.
- Sets status to `archived`.

## Validation

- `company` is required for creation.
- `title` is required for creation.
- Strings are trimmed.
- Empty optional strings become `null`.
- `salaryMinEur` and `salaryMaxEur` must be positive integers or `null`.
- `salaryMinEur` must be less than or equal to `salaryMaxEur` when both are provided.
- `url` must be a valid URL or `null`/empty.
- Unknown fields are rejected.
- `userId` cannot be changed.

## Web UI Expectations

- Keep the UI simple.
- Keep demo login available.
- Add navigation between:
  - Candidate Profile
  - Job Inbox
- Show a list of active jobs.
- Allow creating a manual job with:
  - company
  - title
  - location
  - remote type
  - salary text
  - URL
  - full description
- Allow opening a job detail.
- Allow archiving a job.
- Show status and source quality.
- Use `NEXT_PUBLIC_API_URL`.
- Send cookies with API requests.

## Non-goals

- No AI extraction.
- No AI review.
- No Groq, Gemini, or Ollama calls.
- No application pipeline.
- No Gmail/OAuth.
- No CSV import.
- No browser extension.
- No job board scraping.
- No cover letters.
- No advanced search.
- No shadcn/ui unless already present.

## Acceptance Criteria

- Job migration applies successfully.
- All `/jobs` routes require auth.
- Jobs are scoped to the authenticated user.
- Manual job creation works.
- Jobs list excludes archived jobs by default.
- `GET /jobs/:id` returns job detail with description.
- `PUT /jobs/:id` updates allowed fields and description text.
- `POST /jobs/:id/archive` hides the job from default list results.
- Web UI can log in as the demo user, create a job, view it, and archive it.
- No future milestone functionality is implemented.

## Local Test Commands

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
pnpm dev:api
pnpm dev:web
```

API checks:

```bash
curl http://127.0.0.1:4000/health
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"company":"Example GmbH","title":"Backend Engineer","location":"Berlin","remoteType":"hybrid","salaryText":"70000 EUR","url":"https://example.com/jobs/backend","fullDescription":"Build APIs with TypeScript."}' \
  http://127.0.0.1:4000/jobs
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs/JOB_ID
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X PUT \
  -d '{"location":"Remote","salaryMinEur":70000,"salaryMaxEur":85000}' \
  http://127.0.0.1:4000/jobs/JOB_ID
curl -i -b /tmp/jobcc-cookies.txt -X POST http://127.0.0.1:4000/jobs/JOB_ID/archive
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/jobs
```
