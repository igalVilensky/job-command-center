# Extraction Schema

The extraction task turns messy job/email text into structured job records.

## Output

```json
{
  "sourceKind": "single_job | multi_job_digest | recruiter_message | not_job_source",
  "jobs": [
    {
      "company": "",
      "title": "",
      "location": "",
      "remoteType": "remote | remote_first | hybrid | homeoffice_possible | onsite | unknown",
      "salaryText": "",
      "salaryMinEur": null,
      "salaryMaxEur": null,
      "url": "",
      "descriptionSummary": "",
      "fullDescription": "",
      "sourceQuality": "full_description | digest_summary | email_summary | unknown",
      "needsFullDescription": true,
      "confidence": "high | medium | low"
    }
  ],
  "warnings": []
}
```

## Rules

- Do not treat labels like "Passt hervorragend" or "Beliebter Job" as company names.
- Return all real job opportunities from a digest.
- If text has only a teaser, mark `needsFullDescription=true`.
- Use empty strings for unknown text fields.
- Use null for unknown numeric salary values.
- Do not invent salary, remote policy, or language requirements.
- Extraction is not review.
