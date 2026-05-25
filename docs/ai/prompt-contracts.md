# Prompt Contracts

Prompts should be versioned and kept stable.

## General rules

Prompts must:

- request strict JSON
- define exact schema
- include candidate profile only when needed
- include compact job text
- instruct model not to invent facts
- instruct model to flag uncertainty
- avoid unnecessary long context

## Compacting strategy

Before sending to AI, build compact input:

- title
- company
- location
- remote type
- salary
- source quality
- summary
- relevant description excerpt

Avoid sending huge raw emails when possible.

## Prompt versions

Suggested version names:

- `extract_jobs_v1`
- `review_job_v1`
