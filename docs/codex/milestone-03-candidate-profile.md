# Milestone 03: Candidate Profile Settings

## Goal

Allow an authenticated user to view and update their own candidate profile.

This milestone makes the candidate profile editable through the API and adds a minimal web settings screen for local use. It must stay scoped to candidate profile settings only.

## Scope

- Add authenticated API routes for candidate profile read/update.
- Return or create a default `CandidateProfile` for the current user.
- Validate profile update input before writing to the database.
- Keep all profile data scoped to the authenticated user.
- Add a minimal web UI that can log in with the demo user, fetch `/profile`, edit core profile fields, and save updates.
- Update current-state documentation and README usage notes.

## API Endpoints

### `GET /profile`

- Requires auth.
- Returns the authenticated user's `CandidateProfile`.
- Creates a default profile for the authenticated user if one does not exist.

### `PUT /profile`

- Requires auth.
- Accepts only supported profile fields.
- Validates and normalizes input.
- Updates only the authenticated user's profile.
- Returns the updated profile.

Supported fields:

- `targetRoles`
- `strongSkills`
- `secondarySkills`
- `avoidSkills`
- `mixedSkills`
- `minimumSalaryEur`
- `salaryMinEur`
- `salaryMaxEur`
- `preferredLocations`
- `remotePreference`
- `acceptableRemoteTypes`
- `locationNotes`
- `salaryNotes`
- `germanLevel`
- `englishLevel`
- `seniorityNotes`
- `industryPreferences`
- `industryAvoid`
- `availabilityDate`
- `profileNotes`

## Validation

- Array fields must be arrays of strings.
- Strings are trimmed.
- Empty array items are removed.
- `minimumSalaryEur`, `salaryMinEur`, and `salaryMaxEur` must be positive integers or `null`.
- `salaryMinEur` must be less than or equal to `salaryMaxEur` when both are provided.
- `acceptableRemoteTypes` must contain only supported remote modes.
- `availabilityDate` must be `null` or a valid date string.
- Unknown fields are rejected.
- `userId` cannot be changed.

## Web UI Expectations

- Keep the UI simple and practical.
- Use `NEXT_PUBLIC_API_URL`.
- Call `apps/api` only.
- Send credentials/cookies with API requests.
- Provide a small demo login form.
- Fetch the profile after login.
- Allow editing:
  - target roles
  - strong skills
  - avoid skills
  - desired salary min/max
  - salary notes
  - preferred locations
  - location notes
  - acceptable remote modes
  - German level
  - English level
  - profile notes
- Show loading, success, and error states.

## Non-goals

- No job CRUD.
- No job inbox.
- No imports.
- No AI extraction or review.
- No application pipeline.
- No Gmail/OAuth or external integrations.
- No polished app shell.
- No shadcn/ui unless it already exists.

## Acceptance Criteria

- `GET /profile` requires auth.
- `PUT /profile` requires auth.
- `GET /profile` creates a default profile when missing.
- `PUT /profile` updates only allowed profile fields.
- Profile updates cannot change `userId`.
- Profile updates are scoped to the authenticated user.
- Web UI can log in as the seeded demo user.
- Web UI can fetch, edit, save, and re-fetch the profile.
- No future milestone features are implemented.

## Local Test Commands

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
pnpm dev:api
pnpm dev:web
```

API checks:

```bash
curl http://127.0.0.1:4000/health
curl -i -c /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@jobcc.local","password":"password123"}' \
  http://127.0.0.1:4000/auth/login
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/profile
curl -i -b /tmp/jobcc-cookies.txt \
  -H "Content-Type: application/json" \
  -X PUT \
  -d '{"targetRoles":["Backend Engineer"],"strongSkills":["TypeScript"],"minimumSalaryEur":70000}' \
  http://127.0.0.1:4000/profile
curl -i -b /tmp/jobcc-cookies.txt http://127.0.0.1:4000/profile
```
