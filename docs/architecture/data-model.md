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
- job_count
- error_message
- created_at
- updated_at

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
