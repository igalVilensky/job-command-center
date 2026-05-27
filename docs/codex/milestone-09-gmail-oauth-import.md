# Milestone 09: Gmail OAuth Connection + Manual Gmail Import

## Goal

Allow an authenticated user to connect Gmail using OAuth, then manually fetch recent job-alert emails and save them as `ImportedEmail` records. The existing explicit extraction flow remains separate.

## Scope

- Add a user-owned `EmailAccount` model for Gmail OAuth connections.
- Add safe OAuth environment configuration.
- Add authenticated `/gmail` API routes for connection status, OAuth start, disconnect, and manual import.
- Add an OAuth callback route that validates state, exchanges a code for tokens, fetches safe account identity, stores encrypted tokens, and redirects to the web app.
- Add a manual Gmail import action that searches recent Gmail messages, fetches message details, extracts safe metadata/body text, deduplicates into `ImportedEmail`, and returns import counts.
- Extend the existing `Imports` view with Gmail connection and manual import controls.

## Data Model Changes

Add `EmailAccount`:

- `id`
- `userId`
- `user` relation
- `provider` string default `"gmail"`
- `emailAddress` nullable string
- `displayName` nullable string
- `accessTokenEncrypted` nullable text
- `refreshTokenEncrypted` nullable text
- `tokenExpiresAt` nullable `DateTime`
- `scopes` string array default `[]`
- `status` string default `"connected"`
- `lastSyncAt` nullable `DateTime`
- `createdAt`
- `updatedAt`

Update `User`:

- Add `emailAccounts` relation.

Indexes and constraints:

- Unique `(userId, provider, emailAddress)` where practical.
- Index `(userId, provider)`.
- Index `status`.

Token handling:

- Tokens must never be returned to the web app.
- Tokens should be encrypted before storage with a helper backed by `EMAIL_TOKEN_ENCRYPTION_KEY`.
- Production deployments must provide a strong secret value.

## OAuth Flow

### Start

`GET /gmail/oauth/start` requires auth.

Behavior:

- Validates that Google OAuth env vars are configured.
- Creates a CSRF/state value tied to the current user.
- Stores state server-side with an expiry.
- Builds a Google OAuth URL using minimal scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `openid`
  - `email`
  - `profile`
- Uses `access_type=offline`.
- Uses `prompt=consent` so local testing can receive a refresh token.
- Returns `{ authUrl }`.
- Does not expose the client secret.

### Callback

`GET /gmail/oauth/callback` does not use cookie auth, but must validate OAuth `state`.

Behavior:

- Validates state and clears it after use.
- Exchanges authorization `code` for tokens through Google OAuth token endpoint.
- Fetches safe user identity from Google userinfo.
- Stores or updates an `EmailAccount` for the current user.
- Encrypts access and refresh tokens before storage.
- Redirects back to the web app with `gmail=connected` or `gmail=error`.

## Gmail Import Behavior

`POST /gmail/import/recent` requires auth and a connected Gmail account.

Request body:

- `query` optional string, default `label:jobAlerts newer_than:30d`
- `maxResults` optional number, default `10`, maximum `25`

Behavior:

- Validates query and max results.
- Decrypts stored token only inside the API.
- Refreshes access token if expired.
- Calls Gmail `users.messages.list` with `userId=me`, query, and max results.
- Fetches each message with `users.messages.get`.
- Extracts:
  - provider message ID
  - provider thread ID
  - from email/name
  - subject
  - received date
  - snippet
  - plain text body or stripped HTML fallback
  - raw metadata JSON
- Truncates body text to a safe maximum.
- Creates `ImportedEmail` records through the existing dedupe key `(userId, provider, providerMessageId)`.
- Does not automatically extract jobs.
- Updates `EmailAccount.lastSyncAt`.
- Returns imported count, duplicate count, email list, and query used.

## API Endpoints

All `/gmail` routes require auth except the callback, which validates OAuth state.

### `GET /gmail/status`

Returns safe account info:

- `connected`
- `emailAddress`
- `displayName`
- `status`
- `lastSyncAt`

Never returns tokens.

### `GET /gmail/oauth/start`

Returns:

- `authUrl`

### `GET /gmail/oauth/callback`

Handles Google callback and redirects to the web app.

### `POST /gmail/disconnect`

Marks the Gmail account disconnected and clears encrypted tokens.

Returns:

- `ok`

### `POST /gmail/import/recent`

Manually imports recent Gmail messages into `ImportedEmail`.

Returns:

- `imported`
- `duplicates`
- `emails`
- `query`

## Web UI Expectations

Extend the existing `Imports` view.

Add a Gmail connection section:

- Show connection status from `GET /gmail/status`.
- Show safe connected account info only.
- Button/link to start OAuth.
- Disconnect button.

Add a manual Gmail import form:

- Gmail query input with default `label:jobAlerts newer_than:30d`.
- Max results input.
- Button: `Import from Gmail`.
- After import, show imported and duplicate counts.
- Refresh imported email history after import.

Keep the simulated import form for local testing.

The web app must only call `apps/api`; it must not call Google or Gmail directly and must not contain secrets.

## Non-Goals

Do not implement:

- background polling
- scheduled imports
- automatic extraction after Gmail import
- Gmail label creation
- email sending
- application emails
- cover letters
- calendar/reminders
- browser extension
- scraping
- auto-apply
- multi-provider email beyond Gmail

## Acceptance Criteria

- Migration applies successfully.
- User can see Gmail disconnected status.
- User can start OAuth flow.
- Callback stores connected Gmail account without exposing tokens.
- Status shows connected account.
- Manual Gmail import creates `ImportedEmail` records.
- Duplicate Gmail message import does not create duplicates.
- Imported Gmail emails appear in Imports history.
- User can click existing `Extract jobs from email`.
- Existing simulated import, manual job creation, paste extraction, AI review, and pipeline tracking still work.
- Disconnect removes or clears Gmail connection.

## Local Setup/Test Commands

Create Google OAuth credentials:

1. Create or select a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen for local testing.
4. Create OAuth client credentials for a web application.
5. Add redirect URI `http://127.0.0.1:4000/gmail/oauth/callback`.

Set local `.env` values:

```bash
GOOGLE_CLIENT_ID="replace_with_local_client_id"
GOOGLE_CLIENT_SECRET="replace_with_local_client_secret"
GOOGLE_OAUTH_REDIRECT_URL="http://127.0.0.1:4000/gmail/oauth/callback"
EMAIL_TOKEN_ENCRYPTION_KEY="replace_me_with_32_byte_base64_or_long_secret"
```

Start Postgres:

```bash
docker compose up -d postgres
```

Prepare the API database:

```bash
pnpm --filter @jobcc/api db:generate
pnpm --filter @jobcc/api db:migrate
pnpm --filter @jobcc/api db:seed
```

Run services:

```bash
pnpm dev:api
pnpm dev:ai
pnpm dev:web
```

Run static checks:

```bash
pnpm --filter @jobcc/api lint
pnpm --filter @jobcc/web lint
```

Manual local flow:

1. Log in as `demo@jobcc.local` / `password123`.
2. Open `Imports`.
3. Connect Gmail.
4. Run manual Gmail import with `label:jobAlerts newer_than:30d`.
5. Verify imported emails appear in history.
6. Select an imported email and click `Extract jobs from email`.
7. Verify created jobs appear in Job Inbox.
8. Run AI review.
9. Update pipeline status.
