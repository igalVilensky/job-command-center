import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type QueueFilter,
  type User,
  formatDate
} from "./types";
import { BadgeRow, StatusBadge } from "./StatusBadge";

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

const statusTone = (status: JobAlertProcessingSession["status"]) => {
  if (status === "running") {
    return "accent";
  }

  if (status === "completed") {
    return "success";
  }

  if (status === "failed") {
    return "danger";
  }

  if (status === "cancelled") {
    return "warning";
  }

  return "muted";
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
  const nextReviewSeconds = session?.nextReviewAt
    ? Math.max(0, Math.ceil((new Date(session.nextReviewAt).getTime() - now) / 1000))
    : null;
  const currentReview = session?.reviewQueue.find(
    (item) => item.jobId === session.currentReviewJobId
  );
  const remainingReviews =
    session?.reviewQueue.filter((item) => item.status === "queued" || item.status === "running")
      .length ?? 0;
  const estimatedRemainingSeconds =
    session && remainingReviews > 1 ? (remainingReviews - 1) * session.reviewDelaySeconds : 0;
  const metrics = useMemo(
    () => [
      metric("Imported", session?.importedCount ?? 0),
      metric("Duplicates", session?.duplicateCount ?? 0),
      metric("Emails", `${session?.extractedEmailsCount ?? 0}/${session?.emailsToExtractCount ?? 0}`),
      metric("Failed emails", session?.failedEmailsCount ?? 0),
      metric("Jobs created", session?.jobsCreatedCount ?? 0),
      metric("Ready for review", session?.jobsReadyForReviewCount ?? 0),
      metric("Need description", session?.jobsNeedingFullDescriptionCount ?? 0),
      metric("Reviewed", `${session?.reviewsCompletedCount ?? 0}/${session?.reviewQueue.length ?? 0}`),
      metric("Review failures", session?.reviewsFailedCount ?? 0)
    ],
    [session]
  );

  useEffect(() => {
    if (!session?.nextReviewAt || status !== "running") {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [session?.nextReviewAt, status]);

  return (
    <section className="processing-panel" aria-label="Job alert processing">
      <div className="section-heading">
        <div>
          <h3>Job Alert Processing</h3>
          <p className="muted">
            Imports emails, extracts jobs, and reviews eligible full-description jobs one by one.
          </p>
        </div>
        <BadgeRow>
          <StatusBadge label={status.replace(/_/g, " ")} tone={statusTone(status)} />
        </BadgeRow>
      </div>

      {status === "idle" ? (
        <form className="job-form processing-form" onSubmit={onStart}>
          <div className="form-grid">
            <label>
              Gmail query
              <input
                value={form.gmailQuery}
                onChange={(event) => updateField("gmailQuery", event.target.value)}
              />
            </label>

            <label>
              Max results
              <input
                value={form.maxResults}
                inputMode="numeric"
                onChange={(event) => updateField("maxResults", event.target.value)}
              />
            </label>

            <label>
              Review delay seconds
              <input
                value={form.reviewDelaySeconds}
                inputMode="numeric"
                onChange={(event) => updateField("reviewDelaySeconds", event.target.value)}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="button-primary" disabled={isBusy || !user} type="submit">
              Start job-alert session
            </button>
            <button disabled={isBusy || !user} type="button" onClick={() => void onRefresh()}>
              Refresh session
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="processing-status-grid">
            <div className="processing-step">
              <span className="eyebrow">Current step</span>
              <strong>{session?.currentStep ?? "Idle"}</strong>
              <small>
                Started {formatDate(session?.startedAt ?? null)}
                {session?.completedAt ? ` · Finished ${formatDate(session.completedAt)}` : ""}
              </small>
            </div>

            <div className="processing-step">
              <span className="eyebrow">AI review</span>
              <strong>
                {currentReview
                  ? `${currentReview.title} at ${currentReview.company}`
                  : nextReviewSeconds !== null
                    ? `Next review in ${formatSeconds(nextReviewSeconds)}`
                    : "No review running"}
              </strong>
              <small>
                Delay {session?.reviewDelaySeconds ?? 60}s
                {estimatedRemainingSeconds > 0
                  ? ` · about ${formatSeconds(estimatedRemainingSeconds)} queued wait`
                  : ""}
              </small>
            </div>
          </div>

          <dl className="processing-metrics">
            {metrics.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          {session?.errors.length ? (
            <div className="processing-message message-danger">
              <h4>Errors</h4>
              <ul className="compact-list">
                {session.errors.slice(0, 5).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {session?.warnings.length ? (
            <details className="inline-disclosure">
              <summary>Warnings</summary>
              <ul className="compact-list">
                {session.warnings.slice(0, 8).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="button-row">
            {status === "running" ? (
              <>
                <button disabled={isBusy || !user} type="button" onClick={() => void onRefresh()}>
                  Refresh session
                </button>
                <button
                  className="button-danger"
                  disabled={isBusy || !user}
                  type="button"
                  onClick={onCancel}
                >
                  Cancel session
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onOpenJobsFilter("all")}>
                  Go to jobs ready for triage
                </button>
                <button type="button" onClick={() => onOpenJobsFilter("needs_description")}>
                  Go to jobs needing full description
                </button>
                <button type="button" onClick={onOpenImports}>
                  View import history
                </button>
                <button disabled={isBusy || !user} type="button" onClick={() => void onRefresh()}>
                  Refresh session
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
