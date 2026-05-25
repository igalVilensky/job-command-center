# Build Order

Do not ask Codex to build the whole app at once.

## Milestone 1: Project skeleton

Create monorepo structure and placeholder apps.

Requirements:

- pnpm workspace
- Turbo
- `apps/web`
- `apps/api`
- `apps/ai-service`
- Docker Compose Postgres
- `.env.example`
- root README
- health routes
- no real product logic yet

## Milestone 2: Database and auth foundation

Add Prisma/Postgres schema and basic auth.

## Milestone 3: Candidate profile settings

Build editable candidate profile UI and API.

## Milestone 4: Job inbox

Build job list and job detail.

## Milestone 5: Mock AI service

Implement mock extraction and mock review.

## Milestone 6: Groq provider

Implement Groq provider in AI service.

## Milestone 7: Application pipeline

Add pipeline statuses and simple Kanban/list UI.

## Milestone 8: Import/export and connector recipes

Add CSV import/export and document optional connector recipes.

## Milestone 9: Optional local AI provider

Add Ollama provider.
