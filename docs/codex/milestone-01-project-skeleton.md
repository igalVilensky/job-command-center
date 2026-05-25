# Milestone 01: Project Skeleton

## Goal

Create the initial monorepo skeleton for Job Command Center.

Do not implement product features yet.

## Required structure

```text
apps/
  web/
  api/
  ai-service/

docs/
  product/
  architecture/
  ai/
  codex/

docker-compose.yml
.env.example
package.json
pnpm-workspace.yaml
turbo.json
README.md
```

## apps/web

Create a Next.js + TypeScript app.

Requirements:

- runs on port 3000
- root page displays "Job Command Center"
- basic layout only
- reads `NEXT_PUBLIC_API_URL`
- no auth yet
- no database yet

## apps/api

Create Express + TypeScript app.

Requirements:

- runs on port 4000
- `GET /health` returns JSON
- uses dotenv
- uses cors
- uses express.json with body limit
- centralized error middleware
- no database logic yet except placeholder

## apps/ai-service

Create FastAPI app.

Requirements:

- runs on port 8000
- `GET /health` returns JSON
- env-based provider config placeholder
- mock provider placeholder
- no real AI calls yet

## Docker Compose

Add Postgres service with local credentials:

```text
user: jobcc
password: jobcc
database: jobcc_dev
port: 5432
```

## Acceptance criteria

- `pnpm install` succeeds
- `docker compose up -d postgres` starts Postgres
- API health route responds
- AI service health route responds
- Web app loads
- No secrets are committed
- README explains how to run the skeleton
