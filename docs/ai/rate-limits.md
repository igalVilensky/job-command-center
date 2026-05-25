# AI Rate Limits

AI providers have rate limits and token limits.

## Lessons from prototype

- Full job emails can be too large.
- Groq free/on-demand can hit TPM limits.
- Gemini free tier can hit daily request limits.
- Batch processing should stop on provider rate-limit errors.
- Prompt compaction is necessary.

## Suggested defaults

```bash
AI_REVIEW_MAX_DESCRIPTION_CHARS=4500
AI_EXTRACTION_MAX_SOURCE_CHARS=20000
AI_BATCH_REVIEW_LIMIT=1
AI_BATCH_IMPORT_LIMIT=3
```

## UI behavior

When rate-limited:

- show user a readable message
- do not lose data
- let user retry later
- keep job status unchanged where possible
