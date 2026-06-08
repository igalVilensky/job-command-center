import { type FormEvent, type ReactNode } from "react";

import {
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type ImportedEmail,
  type Job,
  type QueueFilter,
  type User,
  formatDate,
  jobIsStrongMatch,
  jobNeedsClarification,
  jobNeedsPipelineFollowUp,
  jobNeedsReview,
  sourceNeedsFullDescription
} from "./types";
import { JobAlertProcessingPanel } from "./JobAlertProcessingPanel";
import { BadgeRow, StatusBadge, type BadgeTone } from "./StatusBadge";

type DashboardPanelProps = {
  importedEmails: ImportedEmail[];
  jobs: Job[];
  processingForm: JobAlertProcessingFormState;
  processingSession: JobAlertProcessingSession | null;
  user: User | null;
  isBusy: boolean;
  onCancelProcessingSession: () => void;
  onOpenImports: () => void;
  onOpenJob: (job: Job) => void;
  onOpenJobsFilter: (filter: QueueFilter) => void;
  onOpenProfile: () => void;
  onRefreshProcessingSession: () => void | Promise<unknown>;
  onStartProcessingSession: (event: FormEvent<HTMLFormElement>) => void;
  updateProcessingField: (field: keyof JobAlertProcessingFormState, value: string) => void;
};

type CommandItem = {
  id: string;
  title: string;
  reason: string;
  nextAction: string;
  actionLabel: string;
  tone: BadgeTone;
  onPrimary: () => void;
  meta?: ReactNode;
};

type CommandSection = {
  key: string;
  label: string;
  count: number;
  emptyText?: string;
  items: CommandItem[];
};

const importedEmailIsActive = (email: ImportedEmail) =>
  email.extractionStatus === "failed" ||
  email.extractionStatus === "needs_manual_check" ||
  email.extractionStatus === "extraction_paused_budget" ||
  email.inboxStatus === "active" ||
  email.inboxStatus === "needs_check";

const emailReason = (email: ImportedEmail) =>
  email.prefilterJson?.reason ?? email.triageReason ?? "No prefilter reason saved.";

const reviewScore = (job: Job) =>
  typeof job.latestAiReview?.score === "number" ? job.latestAiReview.score : null;

const jobLabel = (job: Job) => `${job.title} — ${job.company}`;

const firstItems = <T,>(items: T[], count = 4) => items.slice(0, count);

const pausedBudgetReason = (session: JobAlertProcessingSession | null, kind: "extraction" | "review") => {
  if (!session) {
    return null;
  }

  const status = kind === "extraction" ? session.extractionBudgetStatus : session.reviewBudgetStatus;

  if (status === "paused_rate_limit") {
    return `AI ${kind} paused because provider rate limit was reached.`;
  }

  if (status === "exhausted_for_run") {
    return `AI ${kind} exhausted for this run.`;
  }

  return null;
};

const CommandSectionView = ({ section }: { section: CommandSection }) => (
  <section className="command-section" aria-label={section.label}>
    <div className="queue-group-heading">
      <div>
        <h3>{section.label}</h3>
      </div>
      <span className="queue-count">{section.count}</span>
    </div>

    {section.items.length === 0 ? (
      <p className="muted command-empty">{section.emptyText ?? "Nothing needs attention here."}</p>
    ) : (
      <ul className="command-list">
        {section.items.map((item) => (
          <li key={item.id}>
            <article className={`command-item command-${item.tone}`}>
              <div className="command-item-main">
                <div className="command-item-title">
                  <strong>{item.title}</strong>
                  <StatusBadge label={item.nextAction} tone={item.tone} />
                </div>
                <p>{item.reason}</p>
                {item.meta ? <div className="command-meta">{item.meta}</div> : null}
              </div>
              <button className="button-small" type="button" onClick={item.onPrimary}>
                {item.actionLabel}
              </button>
            </article>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export function DashboardPanel({
  importedEmails,
  jobs,
  processingForm,
  processingSession,
  user,
  isBusy,
  onCancelProcessingSession,
  onOpenImports,
  onOpenJob,
  onOpenJobsFilter,
  onOpenProfile,
  onRefreshProcessingSession,
  onStartProcessingSession,
  updateProcessingField
}: DashboardPanelProps) {
  const needsDescription = jobs.filter(sourceNeedsFullDescription);
  const readyForReview = jobs.filter(jobNeedsReview);
  const strongMatches = jobs.filter(jobIsStrongMatch);
  const maybeClarify = jobs.filter(jobNeedsClarification);
  const followUps = jobs.filter(jobNeedsPipelineFollowUp);
  const manualCheckEmails = importedEmails.filter(
    (email) =>
      email.inboxStatus === "needs_check" ||
      email.extractionStatus === "needs_manual_check" ||
      email.prefilterDecision === "needs_manual_check"
  );
  const extractionPausedEmails = importedEmails.filter(
    (email) => email.extractionStatus === "extraction_paused_budget"
  );
  const ignoredEmails = importedEmails.filter(
    (email) => email.inboxStatus === "likely_irrelevant" || email.extractionStatus === "ignored_low_signal"
  );
  const duplicateEmails = importedEmails.filter((email) => email.extractionStatus === "duplicate_source");
  const activeImportedEmails = importedEmails.filter(importedEmailIsActive);
  const extractionPausedReason = pausedBudgetReason(processingSession, "extraction");
  const reviewPausedReason = pausedBudgetReason(processingSession, "review");
  const reviewPausedItems = processingSession?.reviewQueue.filter((item) => item.status === "paused") ?? [];
  const commandSummary = [
    strongMatches.length ? `${strongMatches.length} apply-ready` : null,
    readyForReview.length ? `${readyForReview.length} worth reviewing` : null,
    needsDescription.length ? `${needsDescription.length} need descriptions` : null,
    manualCheckEmails.length ? `${manualCheckEmails.length} need manual checks` : null,
    followUps.length ? `${followUps.length} follow-ups due` : null
  ].filter(Boolean);

  const sections: CommandSection[] = [
    {
      key: "apply-ready",
      label: "Apply-ready",
      count: strongMatches.length,
      emptyText: "No reviewed strong matches are waiting for a decision.",
      items: firstItems(strongMatches).map((job) => ({
        id: job.id,
        title: jobLabel(job),
        reason: `Strong match${reviewScore(job) !== null ? ` with score ${reviewScore(job)}` : ""}. Next: decide whether to apply.`,
        nextAction: "Decide/apply",
        actionLabel: "Open job",
        tone: "success",
        onPrimary: () => onOpenJob(job)
      }))
    },
    {
      key: "worth-reviewing",
      label: "Ready for AI review",
      count: readyForReview.length,
      emptyText: "No full-description jobs are waiting for AI review.",
      items: firstItems(readyForReview).map((job) => ({
        id: job.id,
        title: jobLabel(job),
        reason: "Full description is available and deterministic triage did not discard it.",
        nextAction: "AI review",
        actionLabel: "Review job",
        tone: "accent",
        onPrimary: () => onOpenJob(job)
      }))
    },
    {
      key: "needs-description",
      label: "Needs full description",
      count: needsDescription.length,
      emptyText: "No jobs are blocked on missing source text.",
      items: firstItems(needsDescription).map((job) => ({
        id: job.id,
        title: jobLabel(job),
        reason: `Source quality is ${job.sourceQuality.replace(/_/g, " ")}. AI review should wait for the full description.`,
        nextAction: "Add description",
        actionLabel: "Add details",
        tone: "warning",
        onPrimary: () => onOpenJob(job)
      }))
    },
    {
      key: "manual-check",
      label: "Needs manual check (email source or job blocker)",
      count: manualCheckEmails.length + maybeClarify.length,
      emptyText: "No ambiguous email or reviewed job needs a human decision right now.",
      items: [
        ...firstItems(manualCheckEmails).map((email) => ({
          id: email.id,
          title: email.subject || email.providerMessageId,
          reason: emailReason(email),
          nextAction: "Manual check",
          actionLabel: "Open imports",
          tone: "warning" as const,
          onPrimary: onOpenImports,
          meta: (
            <BadgeRow>
              <StatusBadge
                label={email.prefilterDecision ?? email.extractionStatus}
                tone="warning"
              />
              {email.jobLikelihoodScore !== null ? (
                <StatusBadge label={`Score ${email.jobLikelihoodScore}`} tone="neutral" />
              ) : null}
            </BadgeRow>
          )
        })),
        ...firstItems(maybeClarify).map((job) => ({
          id: job.id,
          title: jobLabel(job),
          reason: "AI review or your decision marked this as maybe. Clarify blockers before applying.",
          nextAction: "Clarify",
          actionLabel: "Open job",
          tone: "info" as const,
          onPrimary: () => onOpenJob(job)
        }))
      ].slice(0, 6)
    },
    {
      key: "extraction-budget",
      label: "AI extraction paused / AI budget",
      count: extractionPausedEmails.length + (extractionPausedReason ? 1 : 0),
      emptyText: "Extraction budget is available.",
      items: [
        ...(extractionPausedReason
          ? [
              {
                id: "extraction-budget-status",
                title: "AI extraction budget",
                reason: `${extractionPausedReason} Next: try again later or lower the run caps.`,
                nextAction: "Wait/retry",
                actionLabel: "Refresh",
                tone: "warning" as const,
                onPrimary: () => void onRefreshProcessingSession()
              }
            ]
          : []),
        ...firstItems(extractionPausedEmails).map((email) => ({
          id: email.id,
          title: email.subject || email.providerMessageId,
          reason: email.errorMessage || emailReason(email),
          nextAction: "Paused",
          actionLabel: "Open imports",
          tone: "warning" as const,
          onPrimary: onOpenImports
        }))
      ].slice(0, 5)
    },
    {
      key: "review-budget",
      label: "AI review paused / AI budget",
      count: reviewPausedItems.length + (reviewPausedReason ? 1 : 0),
      emptyText: "Review budget is available.",
      items: [
        ...(reviewPausedReason
          ? [
              {
                id: "review-budget-status",
                title: "AI review budget",
                reason: `${reviewPausedReason} Next: try again later or reduce max AI reviews.`,
                nextAction: "Wait/retry",
                actionLabel: "Refresh",
                tone: "warning" as const,
                onPrimary: () => void onRefreshProcessingSession()
              }
            ]
          : []),
        ...firstItems(reviewPausedItems).map((item) => ({
          id: item.jobId,
          title: `${item.title} — ${item.company}`,
          reason: item.errorMessage ?? "AI review paused for this run.",
          nextAction: "Paused",
          actionLabel: "Open queue",
          tone: "warning" as const,
          onPrimary: () => onOpenJobsFilter("ready_for_review")
        }))
      ].slice(0, 5)
    },
    {
      key: "follow-ups",
      label: "Follow-ups due",
      count: followUps.length,
      emptyText: "No pipeline follow-ups are due.",
      items: firstItems(followUps).map((job) => ({
        id: job.id,
        title: jobLabel(job),
        reason: job.nextAction?.trim()
          ? job.nextAction
          : `Follow-up date: ${formatDate(job.followUpDate)}`,
        nextAction: "Follow up",
        actionLabel: "Open job",
        tone: "info",
        onPrimary: () => onOpenJob(job)
      }))
    }
  ];

  const summaryItems = [
    {
      label: "Ignored / low signal",
      count: ignoredEmails.length,
      detail: "Skipped without AI unless you restore or extract manually."
    },
    {
      label: "Duplicates",
      count: duplicateEmails.length,
      detail: "Duplicate sources did not consume AI budget. Can still be extracted manually from Imports if needed."
    },
    {
      label: "Active import sources",
      count: activeImportedEmails.length,
      detail: "Emails still visible in the source/history view."
    }
  ];

  return (
    <section className="dashboard-page command-page" aria-label="Command Queue">
      <div className="page-title-row">
        <div>
          <h2>Command Queue</h2>
          <p className="muted">
            {commandSummary.length > 0
              ? `Needs attention now: ${commandSummary.join(", ")}.`
              : "Nothing urgent is waiting. Sync recent job alerts when you want a fresh pass."}
          </p>
        </div>
        <button type="button" onClick={() => onOpenJobsFilter("all")}>
          Open all jobs
        </button>
      </div>

      <div className="command-section-grid">
        {sections.map((section) => (
          <CommandSectionView key={section.key} section={section} />
        ))}
      </div>

      <section className="command-section command-summary-section" aria-label="Source summaries">
        <div className="queue-group-heading">
          <h3>Ignored / duplicates summary</h3>
        </div>
        <div className="command-summary-grid">
          {summaryItems.map((item) => (
            <div key={item.label}>
              <strong>{item.count}</strong>
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="command-section" aria-label="Manual actions">
        <div className="queue-group-heading">
          <h3>Manual actions</h3>
          <span className="queue-count">1</span>
        </div>
        <ul className="command-list">
          <li>
            <article className="command-item command-neutral">
              <div className="command-item-main">
                <div className="command-item-title">
                  <strong>Update profile preferences</strong>
                  <StatusBadge label="Manual" tone="neutral" />
                </div>
                <p>Keep role, stack, location, salary, and CV context current before spending review budget.</p>
              </div>
              <button className="button-small" type="button" onClick={onOpenProfile}>
                Open profile
              </button>
            </article>
          </li>
        </ul>
      </section>

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
    </section>
  );
}
