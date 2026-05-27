# Security

Security matters because job search data includes personal information, emails, CVs, employer contacts, salary expectations, and API keys.

## Secrets

Never expose these to frontend:

- GROQ_API_KEY
- GEMINI_API_KEY
- OPENAI_API_KEY
- Gmail OAuth secrets
- JWT_SECRET
- AI_SERVICE_TOKEN
- DATABASE_URL
- EMAIL_TOKEN_ENCRYPTION_KEY

## API boundaries

- Web calls API.
- API calls AI service.
- AI service calls providers.
- Web never calls AI providers.
- Web never talks directly to database.
- Web never receives Gmail OAuth tokens.
- Gmail tokens are stored encrypted by the API.

## Human-in-the-loop safety

The app must not auto-apply, auto-send emails, impersonate the user, or submit forms without explicit user action.

## Open-source security note

Users self-host the app and are responsible for their own deployment security.
