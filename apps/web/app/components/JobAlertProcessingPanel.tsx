import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type QueueFilter,
  type User,
  formatDate
} from "./types";
import { BadgeRow, StatusBadge, type BadgeTone } from "./StatusBadge";

type JobAlertProcessingPanelProps = {
  form: JobAlertProcessingFormState;
  isBusy: boolean;
  session: JobAlertProcessingSession | null;
  user: User | null;
  onCancel: () => void;
  onOpenImports: () => void;
  onOpenJobsFilter: (filter: QueueFilter) => void;
  onRefresh: () => void | Promise<unknown>;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
  updateField: (field: keyof JobAlertProcessingFormState, value: string) => void;
};

const statusTone = (status: JobAlertProcessingSession["status"]): BadgeTone => {
  if (status === "running") {
    return "accent";
  }

  if (status === "completed") {
    return "success";
  }

  if (status === "completed_with_paused_items" || status === "cancelled") {
    return "warning";
  }

  if (status === "failed" || status === "completed_with_errors") {
    return "danger";
  }

  return "muted";
};

const budgetTone = (status: JobAlertProcessingSession["extractionBudgetStatus"]): BadgeTone => {
  if (status === "running") {
    return "accent";
  }

  if (status === "paused_rate_limit" || status === "exhausted_for_run") {
    return "warning";
  }

  return "success";
};

const budgetLabel = (status: JobAlertProcessingSession["extractionBudgetStatus"]) => {
  if (status === "paused_rate_limit") {
    return "Paused by rate limit";
  }

  if (status === "exhausted_for_run") {
    return "Exhausted for this run";
  }

  if (status === "running") {
    return "Running";
  }

  return "Available";
};

const formatSeconds = (seconds: number) => {
  if (seconds <= 0) {
    return "now";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder}s`;
};

const metric = (label: string, value: string | number) => ({ label, value });

const statusCount = (
  items: { status: string }[] | undefined,
  statuses: string[]
) => items?.filter((item) => statuses.includes(item.status)).length ?? 0;

export function JobAlertProcessingPanel({
  form,
  isBusy,
  session,
  user,
  onCancel,
  onOpenImports,
  onOpenJobsFilter,
  onRefresh,
  onStart,
  updateField
}: JobAlertProcessingPanelProps) {
  const [now, setNow] = useState(Date.now());
  const status = session?.status ?? "idle";
  const isRunning = status === "running";
  const nextExtractionSeconds = session?.nextExtractionAt
    ? Math.max(0, Math.ceil((new Date(session.nextExtractionAt).getTime() - now) / 1000))
    : null;
  const nextReviewSeconds = session?.nextReviewAt
    ? Math.max(0, Math.ceil((new Date(session.nextReviewAt).getTime() - now) / 1000))
    : null;
  const currentExtraction = session?.extractionQueue.find(
    (item) => item.importedEmailId === session.currentExtractionEmailId
  );
  const currentReview = session?.reviewQueue.find(
    (item) => item.jobId === session.currentReviewJobId
  );
  const extractionQueued = statusCount(session?.extractionQueue, ["queued", "running"]);
  const reviewQueued = statusCount(session?.reviewQueue, ["queued", "running"]);
  const extractionPaused = statusCount(session?.extractionQueue, ["paused"]);
  const reviewPaused = statusCount(session?.reviewQueue, ["paused"]);
  const metrics = useMemo(
    () => [
      metric("Imported", session?.importedCount ?? 0),
      metric("Duplicates", session?.duplicateCount ?? 0),
      metric("Considered", session?.emailsConsideredCount ?? 0),
      metric(
        "Emails capped",
        `${session?.emailsToExtractCount ?? 0}/${session?.maxEmailsToProcess ?? form.maxEmailsToProcess}`
      ),
      metric(
        "AI extractions",
        `${session?.extractedEmailsCount ?? 0}/${session?.maxExtractionsPerRun ?? form.maxExtractionsPerRun}`
      ),
      metric("Skipped prefilter", session?.emailsSkippedPrefilterCount ?? 0),
      metric("Paused emails", session?.emailsPausedByBudgetCount ?? 0),
      metric("Jobs created", session?.jobsCreatedCount ?? 0),
      metric(
        "AI reviews",
        `${session?.reviewsCompletedCount ?? 0}/${session?.maxReviewsPerRun ?? form.maxReviewsPerRun}`
      ),
      metric("Paused reviews", reviewPaused)
    ],
    [form.maxEmailsToProcess, form.maxExtractionsPerRun, form.maxReviewsPerRun, reviewPaused, session]
  );

  const summaryText = useMemo(() => {
    if (!session || status === "idle") return null;

    if (session.maxExtractionsPerRun === 0 && session.maxReviewsPerRun === 0) {
      return "Prefilter-only mode: no AI extraction/review calls were used. Items were evaluated and kept in their prefilter state.";
    }

    const imported = session.importedCount;
    const duplicates = session.duplicateCount;
    const considered = session.emailsConsideredCount;
    const ignored = session.emailsSkippedPrefilterCount + session.duplicateSourceCount;
    const extractions = session.extractedEmailsCount;
    const created = session.jobsCreatedCount;
    const reviews = session.reviewsCompletedCount;

    let text = `Checked ${imported} Gmail results. `;
    if (duplicates > 0) text += `${duplicates} were already imported. `;
    if (considered > 0) {
      if (ignored > 0) {
        text += `${ignored} ignored before AI. `;
      }
      if (extractions > 0) {
        text += `Used ${extractions} AI extraction${extractions > 1 ? "s" : ""} to create ${created} job${created !== 1 ? "s" : ""}. `;
      }
      if (reviews > 0) {
        text += `Used ${reviews} AI review${reviews > 1 ? "s" : ""}. `;
      }
    } else if (imported > 0 && considered === 0 && !session.includeBacklog) {
      text += "No new emails to consider. ";
    }

    if (
      session.extractionBudgetStatus === "exhausted_for_run" ||
      session.extractionBudgetStatus === "paused_rate_limit"
    ) {
      text += "AI extraction paused because the run budget or rate limit was reached. Increase max extractions or process later. ";
    } else if (
      session.reviewBudgetStatus === "exhausted_for_run" ||
      session.reviewBudgetStatus === "paused_rate_limit"
    ) {
      text += "AI review paused because the run budget or rate limit was reached. Increase max reviews or process later. ";
    }

    return text.trim();
  }, [session, status]);

  useEffect(() => {
    if ((!session?.nextExtractionAt && !session?.nextReviewAt) || status !== "running") {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [session?.nextExtractionAt, session?.nextReviewAt, status]);

  return (
    <section className="processing-panel" aria-label="Budget-aware job alert processing">
      <div className="section-heading">
        <div>
          <h3>Sync and Triage</h3>
          <p className="muted">
            Import the current Gmail batch, prefilter obvious noise, then spend AI calls only inside
            the run budget.
          </p>
        </div>
        <BadgeRow>
          <StatusBadge label={status.replace(/_/g, " ")} tone={statusTone(status)} />
        </BadgeRow>
      </div>

      <form className="job-form processing-form" onSubmit={onStart}>
        <div className="form-grid">
          <label className="wide">
            Gmail query
            <input
              disabled={isRunning}
              value={form.gmailQuery}
              onChange={(event) => updateField("gmailQuery", event.target.value)}
            />
          </label>

          <label>
            Max results
            <input
              disabled={isRunning}
              value={form.maxResults}
              inputMode="numeric"
              onChange={(event) => updateField("maxResults", event.target.value)}
            />
          </label>

          <label>
            Max emails to process
            <input
              disabled={isRunning}
              value={form.maxEmailsToProcess}
              inputMode="numeric"
              onChange={(event) => updateField("maxEmailsToProcess", event.target.value)}
            />
          </label>

          <label>
            Max AI extractions
            <input
              disabled={isRunning}
              value={form.maxExtractionsPerRun}
              inputMode="numeric"
              onChange={(event) => updateField("maxExtractionsPerRun", event.target.value)}
            />
          </label>

          <label>
            Max AI reviews
            <input
              disabled={isRunning}
              value={form.maxReviewsPerRun}
              inputMode="numeric"
              onChange={(event) => updateField("maxReviewsPerRun", event.target.value)}
            />
          </label>

          <label>
            Extraction delay seconds
            <input
              disabled={isRunning}
              value={form.extractionDelaySeconds}
              inputMode="numeric"
              onChange={(event) => updateField("extractionDelaySeconds", event.target.value)}
            />
          </label>

          <label>
            Review delay seconds
            <input
              disabled={isRunning}
              value={form.reviewDelaySeconds}
              inputMode="numeric"
              onChange={(event) => updateField("reviewDelaySeconds", event.target.value)}
            />
          </label>

          <label className="processing-toggle wide">
            <input
              checked={form.includeBacklog === "true"}
              disabled={isRunning}
              type="checkbox"
              onChange={(event) =>
                updateField("includeBacklog", event.target.checked ? "true" : "false")
              }
            />
            Include active backlog
          </label>
        </div>

        <div className="button-row">
          <button className="button-primary" disabled={isBusy || !user || isRunning} type="submit">
            Sync and triage
          </button>
          <button disabled={isBusy || !user} type="button" onClick={() => void onRefresh()}>
            Refresh session
          </button>
          {isRunning ? (
            <button
              className="button-danger"
              disabled={isBusy || !user}
              type="button"
              onClick={onCancel}
            >
              Cancel session
            </button>
          ) : null}
        </div>
      </form>

      {session && status !== "idle" ? (
        <>
          <div className="processing-status-grid">
            <div className="processing-step">
              <span className="eyebrow">Current step</span>
              <strong>{session.currentStep}</strong>
              <small>
                Started {formatDate(session.startedAt)}
                {session.completedAt ? ` · Finished ${formatDate(session.completedAt)}` : ""}
              </small>
            </div>

            <div className="processing-step">
              <span className="eyebrow">AI extraction</span>
              <strong>
                {currentExtraction
                  ? currentExtraction.subject
                  : nextExtractionSeconds !== null
                    ? `Next extraction in ${formatSeconds(nextExtractionSeconds)}`
                    : `${extractionQueued} queued · ${extractionPaused} paused`}
              </strong>
              <small>
                Delay {session.extractionDelaySeconds}s ·{" "}
                {budgetLabel(session.extractionBudgetStatus)}
              </small>
            </div>

            <div className="processing-step">
              <span className="eyebrow">AI review</span>
              <strong>
                {currentReview
                  ? `${currentReview.title} at ${currentReview.company}`
                  : nextReviewSeconds !== null
                    ? `Next review in ${formatSeconds(nextReviewSeconds)}`
                    : `${reviewQueued} queued · ${reviewPaused} paused`}
              </strong>
              <small>
                Delay {session.reviewDelaySeconds}s · {budgetLabel(session.reviewBudgetStatus)}
              </small>
            </div>
          </div>

          <BadgeRow label="AI budget status">
            <StatusBadge
              label={`Extraction ${budgetLabel(session.extractionBudgetStatus)}`}
              tone={budgetTone(session.extractionBudgetStatus)}
            />
            <StatusBadge
              label={`Review ${budgetLabel(session.reviewBudgetStatus)}`}
              tone={budgetTone(session.reviewBudgetStatus)}
            />
            <StatusBadge
              label={session.includeBacklog ? "Backlog included" : "Current batch only"}
              tone={session.includeBacklog ? "warning" : "success"}
            />
          </BadgeRow>

          <dl className="processing-metrics">
            {metrics.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          {summaryText ? (
            <div className="processing-message message-neutral">
              <h4>Session summary</h4>
              <p>{summaryText}</p>
            </div>
          ) : null}

          {session.warnings.length ? (
            <details className="inline-disclosure">
              <summary>Technical warnings ({session.warnings.length})</summary>
              <ul className="compact-list">
                {session.warnings.slice(0, 3).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {session.errors.length ? (
            <details className="inline-disclosure">
              <summary>Technical details ({session.errors.length} errors)</summary>
              <ul className="compact-list">
                {session.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <details className="inline-disclosure">
            <summary>
              Extraction queue ({session.extractionQueue.length})
            </summary>
            <ul className="compact-list">
              {session.extractionQueue.slice(0, 12).map((item) => (
                <li key={item.importedEmailId}>
                  {item.subject}: {item.status.replace(/_/g, " ")} · {item.prefilterDecision}
                </li>
              ))}
            </ul>
          </details>

          <details className="inline-disclosure">
            <summary>Review queue ({session.reviewQueue.length})</summary>
            <ul className="compact-list">
              {session.reviewQueue.slice(0, 12).map((item) => (
                <li key={item.jobId}>
                  {item.title} at {item.company}: {item.status.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </details>

          <div className="button-row">
            <button type="button" onClick={() => onOpenJobsFilter("ready_for_review")}>
              Review ready jobs
            </button>
            <button type="button" onClick={() => onOpenJobsFilter("needs_description")}>
              Add full descriptions
            </button>
            <button type="button" onClick={onOpenImports}>
              View import history
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
