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

- Do not mark salary as risk if range includes the user's minimum.
- Do not assume "Homeoffice möglich" means fully remote.
- Do not treat location as blocker if remote-first or fully remote is clear.
- Penalize explicit C1/native German if the candidate has B2.
- Treat short digest summaries as incomplete.
- AI review is advisory; user decides.
