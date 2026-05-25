# Integrations

Integrations should be optional.

The MVP should work without any external integration except optional AI provider keys.

## MVP integrations

- Manual paste.
- CSV import/export.
- Optional Google Apps Script bridge documentation later.

## Future integrations

- Gmail.
- Google Sheets.
- n8n / Make webhooks.
- Browser extension.
- Calendar.

## Integration rules

- Integrations must be optional.
- Integration failures must not break core app.
- External tokens must be stored server-side only.
- Manual import should always remain available.
