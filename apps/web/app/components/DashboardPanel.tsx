import { type FormEvent } from "react";

import {
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type ImportedEmail,
  type Job,
  type QueueFilter,
  type User,
  jobIsStrongMatch,
  jobNeedsClarification,
  jobNeedsPipelineFollowUp,
  jobNeedsReview,
  queueFilterLabels,
  sourceNeedsFullDescription
} from "./types";
import { JobAlertProcessingPanel } from "./JobAlertProcessingPanel";

type DashboardPanelProps = {
  importedEmails: ImportedEmail[];
  jobs: Job[];
  processingForm: JobAlertProcessingFormState;
  processingSession: JobAlertProcessingSession | null;
  user: User | null;
  isBusy: boolean;
  onCancelProcessingSession: () => void;
  onOpenImports: () => void;
  onOpenJobsFilter: (filter: QueueFilter) => void;
  onRefreshProcessingSession: () => void | Promise<unknown>;
  onStartProcessingSession: (event: FormEvent<HTMLFormElement>) => void;
  updateProcessingField: (field: keyof JobAlertProcessingFormState, value: string) => void;
};

type DashboardCard = {
  filter: QueueFilter;
  label: string;
  value: number;
  helper: string;
  tone: "warning" | "accent" | "success" | "info" | "neutral";
};

const importedEmailIsActive = (email: ImportedEmail) =>
  email.extractionStatus === "failed" ||
  email.inboxStatus === "active" ||
  email.inboxStatus === "needs_check";

export function DashboardPanel({
  importedEmails,
  jobs,
  processingForm,
  processingSession,
  user,
  isBusy,
  onCancelProcessingSession,
  onOpenImports,
  onOpenJobsFilter,
  onRefreshProcessingSession,
  onStartProcessingSession,
  updateProcessingField
}: DashboardPanelProps) {
  const needsDescription = jobs.filter(sourceNeedsFullDescription).length;
  const readyForReview = jobs.filter(jobNeedsReview).length;
  const strongMatches = jobs.filter(jobIsStrongMatch).length;
  const maybeClarify = jobs.filter(jobNeedsClarification).length;
  const followUps = jobs.filter(jobNeedsPipelineFollowUp).length;
  const activeImportedEmails = importedEmails.filter(importedEmailIsActive).length;
  const needsCheckEmails = importedEmails.filter((email) => email.inboxStatus === "needs_check").length;
  const reviewedThisSession = processingSession?.reviewsCompletedCount ?? 0;
  const nextBestAction =
    activeImportedEmails > 0
      ? "Process active imported emails"
      : needsDescription > 0
        ? "Paste full descriptions"
        : readyForReview > 0
          ? "Review ready jobs"
          : strongMatches > 0
            ? "Decide on strong matches"
            : "Inbox is clear";

  const cards: DashboardCard[] = [
    {
      filter: "needs_description",
      label: queueFilterLabels.needs_description,
      value: needsDescription,
      helper: "Paste full descriptions before trusting review output.",
      tone: "warning"
    },
    {
      filter: "ready_for_review",
      label: queueFilterLabels.ready_for_review,
      value: readyForReview,
      helper: "Jobs with enough detail for AI scoring.",
      tone: "accent"
    },
    {
      filter: "apply",
      label: queueFilterLabels.apply,
      value: strongMatches,
      helper: "Reviewed jobs worth a decision.",
      tone: "success"
    },
    {
      filter: "maybe",
      label: queueFilterLabels.maybe,
      value: maybeClarify,
      helper: "Jobs with caveats or open questions.",
      tone: "info"
    },
    {
      filter: "follow_up",
      label: queueFilterLabels.follow_up,
      value: followUps,
      helper: "Pipeline items with next actions or dates.",
      tone: "accent"
    },
    {
      filter: "all",
      label: "Total active jobs",
      value: jobs.length,
      helper: "Everything currently unarchived.",
      tone: "neutral"
    }
  ];

  const nextActions = [
    { label: "Enrich jobs missing full descriptions", count: needsDescription, filter: "needs_description" },
    { label: "Review ready jobs", count: readyForReview, filter: "ready_for_review" },
    { label: "Decide on high-scoring jobs", count: strongMatches, filter: "apply" },
    { label: "Follow up pipeline items", count: followUps, filter: "follow_up" }
  ] satisfies { label: string; count: number; filter: QueueFilter }[];

  return (
    <section className="dashboard-page" aria-label="Dashboard">
      <div className="page-title-row">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Active work, grouped by what needs attention next.</p>
        </div>
      </div>

      <JobAlertProcessingPanel
        form={processingForm}
        isBusy={isBusy}
        onCancel={onCancelProcessingSession}
        onOpenImports={onOpenImports}
        onOpenJobsFilter={onOpenJobsFilter}
        onRefresh={onRefreshProcessingSession}
        onStart={onStartProcessingSession}
        session={processingSession}
        updateField={updateProcessingField}
        user={user}
      />

      <section className="dashboard-snapshot" aria-label="Intake snapshot">
        <div>
          <span>Active imported emails</span>
          <strong>{activeImportedEmails}</strong>
        </div>
        <div>
          <span>Needs check</span>
          <strong>{needsCheckEmails}</strong>
        </div>
        <div>
          <span>Latest session jobs</span>
          <strong>{processingSession?.jobsCreatedCount ?? 0}</strong>
        </div>
        <div>
          <span>Ready for review</span>
          <strong>{readyForReview}</strong>
        </div>
        <div>
          <span>Need full description</span>
          <strong>{needsDescription}</strong>
        </div>
        <div>
          <span>Reviewed this session</span>
          <strong>{reviewedThisSession}</strong>
        </div>
        <div className="snapshot-wide">
          <span>Next best action</span>
          <strong>{nextBestAction}</strong>
        </div>
      </section>

      <div className="dashboard-grid">
        {cards.map((card) => (
          <button
            className={`dashboard-card card-${card.tone}`}
            key={card.filter}
            type="button"
            onClick={() => onOpenJobsFilter(card.filter)}
          >
            <span className="dashboard-card-label">{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </button>
        ))}
      </div>

      <section className="next-actions-panel" aria-label="Next best actions">
        <div className="section-heading">
          <h3>Next best actions</h3>
        </div>

        <ul className="action-list">
          {nextActions.map((action) => (
            <li key={action.filter}>
              <button type="button" onClick={() => onOpenJobsFilter(action.filter)}>
                <span>{action.label}</span>
                <em>{action.count}</em>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
