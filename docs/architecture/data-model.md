# Data Model

Initial conceptual data model.

## User

- id
- email
- password_hash
- candidate_cvs
- created_at
- updated_at

## CandidateProfile

- id
- user_id
- profession
- bio
- target_roles
- strong_skills
- secondary_skills
- engineering_skills
- ai_skills
- avoid_skills
- mixed_skills
- minimum_salary_eur
- salary_min_eur
- salary_max_eur
- preferred_locations
- remote_preference
- acceptable_remote_types
- location_notes
- salary_notes
- german_level
- english_level
- languages_json
- experience_summary
- profile_source_id
- seniority_notes
- industry_preferences
- industry_avoid
- availability_date
- profile_notes
- created_at
- updated_at

Candidate profile separates CV-backed facts from job-search preferences. `minimum_salary_eur` is a legacy single-threshold field; current review logic should prefer `salary_min_eur` and `salary_max_eur` as a desired salary range, use `acceptable_remote_types` for multi-mode remote preferences, and use `preferred_locations` plus `location_notes` as editable filters.

## CandidateCv

- id
- user_id
- source_type
- source_name
- source_text
- parsed_profile_json
- is_active
- created_at
- updated_at

## JobSource

- id
- user_id
- source_type
- source_name
- external_id
- metadata_json
- created_at
- updated_at

## Job

- id
- user_id
- source_id
- imported_email_id nullable
- external_source_id
- company
- title
- location
- remote_type
- salary_min_eur
- salary_max_eur
- salary_text
- url
- source_quality
- status
- imported_at
- created_at
- updated_at
- archived_at

Manual enrichment uses the existing `url`, `source_quality`, and `status` fields. Pasting a full description sets `source_quality` to `full_description` by default and marks the job `ready_for_analysis` so AI review can be rerun without deleting older reviews.

## ImportedEmail

- id
- user_id
- provider
- provider_message_id
- provider_thread_id
- from_email
- from_name
- subject
- received_at
- source_label
- snippet
- body_text
- raw_metadata_json
- import_status
- extraction_status
- inbox_status
- processed_at
- hidden_at
- triage_reason
- prefilter_decision
- job_likelihood_score
- prefilter_json
- last_processed_at
- job_count
- error_message
- created_at
- updated_at

`inbox_status` controls whether an imported email appears in the active import inbox. Supported MVP values are `active`, `processed`, `hidden`, `likely_irrelevant`, and `needs_check`. This is separate from `extraction_status`, because an email can be extracted but still need manual checking, or processed and no longer useful in the active inbox.

`triage_reason` stores deterministic keyword classification, prefilter reason, budget pause reason, or user triage notes. It is not an AI-review field.

`prefilter_decision`, `job_likelihood_score`, and `prefilter_json` store deterministic pre-AI extraction metadata. The prefilter can classify an imported email as `ignore_low_signal`, `possible_job_source`, `likely_job_source`, `recruiter_message`, `needs_manual_check`, or `duplicate_source`. This metadata exists so obvious noise and duplicate sources can be skipped without spending AI extraction budget, while still leaving the user in control through manual extraction.

`extraction_status` may include `ignored_low_signal`, `needs_manual_check`, `extraction_paused_budget`, and `duplicate_source` in addition to the earlier `not_started`, `succeeded`, and `failed` states.

## EmailAccount

- id
- user_id
- provider
- email_address
- display_name
- access_token_encrypted
- refresh_token_encrypted
- token_expires_at
- scopes
- status
- last_sync_at
- created_at
- updated_at

## JobDescription

- id
- job_id
- summary_text
- full_text
- raw_source_text
- language
- created_at
- updated_at

Manual enrichment stores the pasted full job description in `full_text`. The current clean behavior is to replace `raw_source_text` with the same pasted full description when enrichment supplies `fullDescription`.

## AiReview

- id
- job_id
- provider
- model
- prompt_version
- score
- decision
- review_text
- risk_flags
- cv_angle
- clarification_questions
- fit_breakdown_json
- raw_response_json
- created_at

`fit_breakdown_json` stores the normalized structured review breakdown for skills, salary, location/remote, language, seniority, and source quality. Older reviews may have `null` here because the field was added after the original review schema.

## Application

- id
- job_id
- user_id
- status
- applied_at
- follow_up_at
- cv_version
- cover_letter_version
- notes
- created_at
- updated_at

## ApplicationEvent

- id
- application_id
- event_type
- title
- notes
- event_at
- created_at

## AutomationRun

- id
- user_id
- job_id nullable
- run_type
- provider
- model
- status
- input_chars
- error_message
- started_at
- finished_at
- metadata_json

## In-process JobAlertProcessingSession

Milestone 20 keeps the backend-driven job-alert processing session in memory; it is not a persisted Prisma model in the MVP.

The API process keeps one active in-memory session with import counts, current-batch email IDs, backlog scope, extraction/review budgets, extraction queue items, review queue items, current extraction/review IDs, next extraction/review times, AI budget statuses, errors, and warnings. This lets the workflow continue if the browser tab closes, as long as the API server keeps running.

Default session behavior is current-batch only:

- `includeBacklog` defaults to `false`.
- `maxEmailsToProcess` defaults to `10`.
- `maxExtractionsPerRun` defaults to `3`.
- `maxReviewsPerRun` defaults to `3`.
- `extractionDelaySeconds` and `reviewDelaySeconds` default to `60`.

Extraction and review are separate budgeted queues. Provider rate limits pause the relevant queue and mark remaining items as paused for later retry instead of failing every remaining email or job.

MVP limitation: the in-memory session does not survive API server restart. Historical AI/extraction work is still represented by persisted `AutomationRun`, `ImportedEmail`, `Job`, `JobDescription`, and `AiReview` rows.
