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
  "fitBreakdown": {
    "skills": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    },
    "salary": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    },
    "locationRemote": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    },
    "language": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    },
    "seniority": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    },
    "sourceQuality": {
      "score": 0,
      "verdict": "strong | medium | weak | unknown",
      "notes": ""
    }
  },
  "confidence": "high | medium | low"
}
```

`fitBreakdown` is required for newly generated reviews from current providers, but older stored reviews may not have a breakdown. The API stores the normalized object in `AiReview.fitBreakdownJson`.

Each breakdown category has:

- `score`: integer from 0 to 100.
- `verdict`: one of `strong`, `medium`, `weak`, or `unknown`.
- `notes`: short concrete reasoning based on the job/profile/source.

## Decision guidance

Use `apply` when there is strong technical fit and no major blockers.

Use `maybe` when technical fit is decent but there are clarification points.

Use `skip` when clear blockers exist.

Use `review_manually` when source is too incomplete or AI confidence is low.

## Rules

- Prefer `salaryMinEur` and `salaryMaxEur` as the candidate's desired salary range. Use legacy `minimumSalaryEur` only as a fallback.
- Do not mark salary as a risk if the job salary range overlaps the candidate range. Example: candidate 48000-55000 EUR and job 43000-66000 EUR overlap; salary fit should be at least `medium`.
- Mark salary below target only when job maximum is below candidate salary minimum.
- Do not assume "Homeoffice möglich" means fully remote.
- Compare `job.remoteType` against `candidateProfile.acceptableRemoteTypes`; unknown remote policy should usually produce a clarification question and `unknown` or `medium` location/remote fit instead of a hard penalty.
- Do not treat location as blocker if remote-first or fully remote is clear or accepted.
- Treat TypeScript plus React or Angular as a strong frontend JS/TS match for a frontend/full-stack JS/TS candidate.
- Treat German B2 versus a generic "fluent German" requirement as a soft risk or clarification, not an automatic hard reject unless the job explicitly requires native/C1 German.
- Treat `full_description` source quality as a strong source-quality fit in most cases. Treat short digest summaries as incomplete.
- Keep the top-level score/decision as the final result. Use `fitBreakdown` for dimension-level debugging and user trust.
- AI review is advisory; user decides.
