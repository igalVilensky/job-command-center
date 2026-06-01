# Review Schema

The review task compares a job to the candidate profile.

## Output

```json
{
  "score": 0,
  "decision": "apply | maybe | skip | review_manually",
  "review": "",
  "riskFlags": [],
  "cvAngle": "",
  "clarificationQuestions": [],
  "confidence": "high | medium | low"
}
```

## Decision guidance

Use `apply` when there is strong technical fit and no major blockers.

Use `maybe` when technical fit is decent but there are clarification points.

Use `skip` when clear blockers exist.

Use `review_manually` when source is too incomplete or AI confidence is low.

## Rules

- Prefer `salaryMinEur` and `salaryMaxEur` as the candidate's desired salary range. Use legacy `minimumSalaryEur` only as a fallback.
- Do not mark salary as a risk if the job salary range overlaps the candidate range. Example: candidate 48000-55000 EUR and job 43000-66000 EUR overlap.
- Mark salary below target only when job maximum is below candidate salary minimum.
- Do not assume "Homeoffice möglich" means fully remote.
- Compare `job.remoteType` against `candidateProfile.acceptableRemoteTypes`; unknown remote policy should usually produce a clarification question instead of a hard penalty.
- Do not treat location as blocker if remote-first or fully remote is clear or accepted.
- Treat TypeScript plus React or Angular as a strong frontend JS/TS match for a frontend/full-stack JS/TS candidate.
- Treat German B2 versus a generic "fluent German" requirement as a soft risk or clarification, not an automatic hard reject unless the job explicitly requires native/C1 German.
- Treat short digest summaries as incomplete.
- AI review is advisory; user decides.
