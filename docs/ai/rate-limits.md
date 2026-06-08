# AI Rate Limits

AI providers have rate limits and token limits.

## Lessons from prototype

- Full job emails can be too large.
- Groq free/on-demand can hit TPM limits.
- Gemini free tier can hit daily request limits.
- Batch processing should stop on provider rate-limit errors.
- AI extraction and AI review both consume provider budget.
- Prompt compaction is necessary.

## Suggested defaults

```bash
AI_REVIEW_MAX_DESCRIPTION_CHARS=4500
AI_EXTRACTION_MAX_SOURCE_CHARS=20000
AI_BATCH_REVIEW_LIMIT=1
AI_BATCH_IMPORT_LIMIT=3
```

Milestone 20 session defaults:

```json
{
  "maxEmailsToProcess": 10,
  "includeBacklog": false,
  "maxExtractionsPerRun": 3,
  "maxReviewsPerRun": 3,
  "extractionDelaySeconds": 60,
  "reviewDelaySeconds": 60
}
```

## UI behavior

When rate-limited:

- show user a readable message
- do not lose data
- let user retry later
- keep job status unchanged where possible
- pause the relevant extraction/review queue
- do not mark all remaining queued items as permanently failed
