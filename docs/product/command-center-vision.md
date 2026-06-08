# Command Center Vision

Job Command Center is a self-hosted, budget-aware command center that reduces job-search chaos by automatically triaging job emails, identifying realistic opportunities, and telling the user the next useful action without auto-applying or wasting AI budget.

It is not a generic job tracker, an auto-apply bot, or a pile of AI buttons. The app should feel calm and private. It should preserve human control, make scarce AI usage visible, and turn noisy inputs into a short queue of decisions.

## North Star

When the user opens the app, the first screen should answer:

> I checked your recent job emails. Most were noise. Here are the opportunities worth your attention, the items that need more information, and the follow-ups due today. AI review is paused because your provider limit was reached.

## Product Principles

- Reduce cognitive load.
- Tell the user what is worth doing next.
- Avoid wasting AI budget.
- Use deterministic and rule-based logic before AI.
- Keep the user human-in-the-loop.
- Make every item end in a clear next action.
- Treat email as an input/source, not the main work object.
- Treat jobs, opportunities, and tasks as the main work objects.
- Add tabs or panels only when they reduce attention load.
- Do not prioritize cover letters, scraping, integrations, or auto-apply until the command-center loop works.

## Near-Term Roadmap

1. Budget-aware automatic triage.
2. Command Queue UI.
3. Review only high-value jobs.
4. Evidence-based fit review.
5. Strategy diagnosis and coaching.

## Future Areas

These are intentionally not part of the current milestone:

- Interview preparation.
- Positioning coach.
- Daily job-search tasks.
- Skill improvement recommendations.
- Application brief generator.
- Source quality analysis.
- Learning from repeated skip/archive decisions.
- Cover-letter generation.
- CV file generation.
- Auto-apply.

## Current Milestone

Milestone 20 realigns the core loop around a budget-aware command queue:

- The processing session defaults to the current Gmail import/query batch only.
- `includeBacklog` defaults to `false`.
- `maxEmailsToProcess`, `maxExtractionsPerRun`, and `maxReviewsPerRun` cap work.
- Extraction and review both count as AI budget.
- Deterministic prefiltering runs before AI extraction.
- Low-signal, duplicate, and paused-budget sources get clear states without spending tokens.
- Provider rate limits pause the relevant queue instead of failing every remaining item.
- The main screen is the Command Queue, grouped by action.

## Manual Tasks

The Command Queue should eventually include system-generated and manual actions in one attention surface. The current implementation only adds a lightweight manual action placeholder for profile preference upkeep. Future manual tasks can cover follow-ups, interview prep, portfolio positioning, and skill improvement once the command-center loop is stable.
