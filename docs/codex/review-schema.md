# Review Schema

The canonical AI review response contract lives in `docs/ai/review-schema.md`.

Milestone 11 adds `fitBreakdown` to new AI reviews and stores it as `AiReview.fitBreakdownJson`. Older reviews may have no breakdown. The breakdown dimensions are skills, salary, location/remote, language, seniority, and source quality, each with a 0-100 score, `strong | medium | weak | unknown` verdict, and short concrete notes for review debugging and user trust.
