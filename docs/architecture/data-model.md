# Data Model

Initial conceptual data model.

## User

- id
- email
- password_hash
- created_at
- updated_at

## CandidateProfile

- id
- user_id
- target_roles
- strong_skills
- secondary_skills
- avoid_skills
- mixed_skills
- minimum_salary_eur
- preferred_locations
- remote_preference
- german_level
- english_level
- seniority_notes
- industry_preferences
- industry_avoid
- availability_date
- profile_notes
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

## JobDescription

- id
- job_id
- summary_text
- full_text
- raw_source_text
- language
- created_at
- updated_at

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
- raw_response_json
- created_at

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
