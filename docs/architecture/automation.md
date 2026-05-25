# Automation Architecture

Automation should be queue-like but simple in the MVP.

## MVP automation model

Use explicit actions:

- Extract jobs from pasted text.
- Analyze one selected job.
- Analyze next ready job.
- Run small batch analysis.

## Rate limit philosophy

The app should:

- process small batches
- compact prompt inputs
- stop gracefully on rate-limit errors
- save partial progress
- allow retry later
- show error in automation logs

## Human-in-the-loop

Automation can import, extract, review, suggest, draft, and remind.

Automation must not automatically apply to jobs or send emails.
