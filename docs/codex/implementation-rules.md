# Codex Implementation Rules

## General

- Work incrementally.
- Prefer small, verifiable commits.
- Follow the build order.
- Do not invent features outside the current milestone.
- Keep docs updated when architecture changes.
- Do not commit secrets.
- Keep `.env.example` safe.

## API

- Use centralized error handling.
- Add `/health`.
- Keep route modules organized.
- Do not call AI providers directly from API.
- Do not expose stack traces in production.

## Web

- Keep UI simple for MVP.
- Use accessible forms.
- Show loading and error states.
- Do not put secrets in client code.

## AI service

- Add `/health`.
- Support mock provider first.
- Provider keys come from environment variables.
- Return structured JSON.
- Validate provider responses.
