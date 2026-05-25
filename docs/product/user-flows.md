# User Flows

## First local setup

1. User clones repo.
2. User copies `.env.example` to `.env`.
3. User starts Postgres through Docker Compose.
4. User runs migrations and seed.
5. User starts `apps/ai-service` in mock mode.
6. User starts `apps/api`.
7. User starts `apps/web`.
8. User opens the app and edits candidate profile.

## Paste a full job description

1. User opens Job Inbox.
2. User clicks Add Job.
3. User pastes a full job description.
4. Job is created with status `ready_for_analysis`.
5. User clicks Analyze.
6. API calls AI service.
7. AI service returns fit review.
8. Job status becomes `analyzed`.

## Paste a multi-job digest email

1. User opens Import.
2. User pastes a job alert email.
3. User clicks Extract Jobs.
4. API calls AI service `/extract-jobs`.
5. AI returns multiple job records.
6. API stores them.
7. Jobs with full descriptions become `ready_for_analysis`.
8. Jobs with summaries only become `needs_full_description`.

## Complete missing job description

1. User filters Needs Full Description.
2. User opens a job detail page.
3. User opens the source URL manually.
4. User pastes the full job description.
5. Job status becomes `ready_for_analysis`.
6. User runs analysis.

## Move job into application pipeline

1. User opens analyzed job.
2. User decides to apply.
3. User changes status to `shortlisted` or `applied`.
4. User adds notes.
5. User optionally adds follow-up date.
