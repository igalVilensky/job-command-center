# Milestone 02: Database + Auth Foundation

## Goal

Add PostgreSQL/Prisma foundation and basic email/password authentication to the API.

This milestone creates the first persisted user data and a cookie-based session flow. It does not add job tracking, candidate settings UI, AI workflows, or external integrations.

## Required scope

- Add Prisma to `apps/api`.
- Read `DATABASE_URL` from environment variables.
- Add initial Prisma models:
  - `User`
  - `CandidateProfile`
- Add Prisma generate, migrate, and seed scripts.
- Add a local demo seed user:
  - email: `demo@jobcc.local`
  - password: `password123`
- Hash passwords before storage.
- Add auth routes:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
- Use an HTTP-only cookie session/JWT.
- Add auth middleware for protected routes.
- Keep `apps/web` minimal; API-first verification is enough for this milestone.
- Update `.env.example`, README setup instructions, and `docs/product/current-state.md` as needed.

## Non-goals

- No job CRUD.
- No candidate settings UI.
- No AI features.
- No Gmail/OAuth.
- No scraping.
- No browser extension.
- No calendar, n8n, Make, or other external integrations.
- No frontend access to `JWT_SECRET`, `DATABASE_URL`, AI keys, or integration secrets.

## Data model

### User

- `id`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`
- one optional `CandidateProfile`

### CandidateProfile

- `id`
- `userId`
- fields from the conceptual candidate profile model may be nullable/defaulted until Milestone 03 adds editable settings.
- `createdAt`
- `updatedAt`

## Security requirements

- Store password hashes only; never store plaintext passwords.
- Use HTTP-only cookies for auth state.
- Do not expose stack traces in production.
- Do not expose auth secrets to `apps/web`.
- Use owner-scoped relationships from the beginning.

## Expected local commands

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
pnpm dev:api
```

## Expected checks

- `curl http://127.0.0.1:4000/health`
- register a user
- login a user
- call `/auth/me` with the returned cookie
- logout the user
- confirm the seeded demo user can login

## Acceptance criteria

- Prisma client generates successfully.
- Initial migration creates `User` and `CandidateProfile`.
- Seed script creates or updates the local demo user.
- API starts without requiring any AI provider keys.
- Auth routes return structured JSON.
- `/auth/me` is protected by cookie/JWT auth.
- Logout clears the auth cookie.
- No product features beyond database/auth foundation are implemented.
