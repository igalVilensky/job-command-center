import {
  type Job,
  type QuickJobDecision,
  type QueueFilter,
  type User,
  formatLocationRemote,
  formatSalary,
  getJobNextAction,
  groupJobsByQueueState,
  jobIsStrongMatch,
  jobNeedsClarification,
  jobNeedsReview,
  previewText,
  queueFilterLabels,
  sourceNeedsFullDescription
} from "./types";
import {
  BadgeRow,
  formatStateLabel,
  JobStatusBadge,
  NextActionBadge,
  ReviewDecisionBadge,
  SourceQualityBadge,
  StatusBadge
} from "./StatusBadge";

type JobQueuePanelProps = {
  allJobs: Job[];
  jobs: Job[];
  totalJobs: number;
  activeFilter: QueueFilter;
  selectedJobId: string | null;
  user: User | null;
  isBusy: boolean;
  onFilterChange: (filter: QueueFilter) => void;
  onOpenJob: (job: Job) => void;
  onRunReview: (id: string) => void;
  onEnrichJob: (job: Job) => void;
  onQuickDecision: (id: string, decision: QuickJobDecision) => void;
  onArchiveJob: (id: string) => void;
};

type PrimaryJobAction = {
  label: string;
  kind: "enrich" | "review" | "open";
  run: () => void;
  disabled?: boolean;
};

const queueFilterOptions: { filter: QueueFilter; label: string }[] = [
  { filter: "all", label: "All" },
  { filter: "needs_description", label: "Needs description" },
  { filter: "ready_for_review", label: "Ready for review" },
  { filter: "apply", label: "Strong matches" },
  { filter: "maybe", label: "Maybe / clarify" },
  { filter: "interested", label: "Interested" },
  { filter: "not_interested", label: "Not interested" }
];

const queueFilterCount = (jobs: Job[], filter: QueueFilter) => {
  if (filter === "needs_description") {
    return jobs.filter(sourceNeedsFullDescription).length;
  }

  if (filter === "ready_for_review") {
    return jobs.filter(jobNeedsReview).length;
  }

  if (filter === "apply") {
    return jobs.filter(jobIsStrongMatch).length;
  }

  if (filter === "maybe") {
    return jobs.filter(jobNeedsClarification).length;
  }

  if (filter === "interested") {
    return jobs.filter((job) => job.userDecision === "interested").length;
  }

  if (filter === "not_interested") {
    return jobs.filter((job) => job.userDecision === "not_interested").length;
  }

  return jobs.length;
};

const queueEmptyMessage = (filter: QueueFilter) => {
  if (filter === "needs_description") {
    return "No jobs need enrichment.";
  }

  if (filter === "ready_for_review") {
    return "No jobs are ready for review.";
  }

  if (filter === "apply") {
    return "No strong matches yet. Run AI reviews to score jobs.";
  }

  if (filter === "maybe") {
    return "No jobs need clarification.";
  }

  if (filter === "interested") {
    return "No interested jobs yet.";
  }

  if (filter === "not_interested") {
    return "No not-interested jobs yet.";
  }

  if (filter === "follow_up") {
    return "No pipeline follow-ups need attention.";
  }

  return "No jobs match the selected filters.";
};

const reviewSignal = (job: Job) => {
  const review = job.latestAiReview;

  if (!review) {
    return null;
  }

  if (review.riskFlags[0]) {
    return {
      label: "Risk",
      text: previewText(review.riskFlags[0], 120),
      tone: "danger" as const
    };
  }

  if (review.clarificationQuestions[0]) {
    return {
      label: "Question",
      text: previewText(review.clarificationQuestions[0], 120),
      tone: "warning" as const
    };
  }

  return null;
};

const jobCardSummary = (job: Job) => {
  const summary =
    job.description?.summaryText?.trim() ||
    job.latestAiReview?.reviewText?.trim() ||
    job.description?.fullText?.trim() ||
    job.description?.rawSourceText?.trim();

  return summary ? previewText(summary, 150) : null;
};

const primaryActionForJob = ({
  job,
  isBusy,
  user,
  onOpenJob,
  onRunReview,
  onEnrichJob
}: {
  job: Job;
  isBusy: boolean;
  user: User | null;
  onOpenJob: (job: Job) => void;
  onRunReview: (id: string) => void;
  onEnrichJob: (job: Job) => void;
}): PrimaryJobAction => {
  if (sourceNeedsFullDescription(job)) {
    return {
      label: "Enrich",
      kind: "enrich",
      disabled: isBusy || !user,
      run: () => onEnrichJob(job)
    };
  }

  if (jobNeedsReview(job)) {
    return {
      label: "Run review",
      kind: "review",
      disabled: isBusy || !user,
      run: () => onRunReview(job.id)
    };
  }

  return {
    label: "Open",
    kind: "open",
    run: () => onOpenJob(job)
  };
};

function JobQueueCard({
  job,
  selected,
  user,
  isBusy,
  onOpenJob,
  onRunReview,
  onEnrichJob,
  onQuickDecision,
  onArchiveJob
}: {
  job: Job;
  selected: boolean;
  user: User | null;
  isBusy: boolean;
  onOpenJob: (job: Job) => void;
  onRunReview: (id: string) => void;
  onEnrichJob: (job: Job) => void;
  onQuickDecision: (id: string, decision: QuickJobDecision) => void;
  onArchiveJob: (id: string) => void;
}) {
  const review = job.latestAiReview;
  const nextAction = getJobNextAction(job);
  const signal = reviewSignal(job);
  const summary = jobCardSummary(job);
  const strongMatch = jobIsStrongMatch(job);
  const primaryAction = primaryActionForJob({
    job,
    isBusy,
    user,
    onOpenJob,
    onRunReview,
    onEnrichJob
  });
  const decisionActions: { decision: QuickJobDecision; label: string; prominent?: boolean }[] = [
    { decision: "interested", label: "Interested", prominent: strongMatch },
    { decision: "maybe", label: "Maybe" },
    { decision: "not_interested", label: "Not interested" }
  ];

  return (
    <li>
      <article className={`job-row${selected ? " selected" : ""}`}>
        <div className="job-row-main">
          <div className="job-row-heading">
            <div>
              <strong>{job.title}</strong>
              <small>{job.company}</small>
            </div>
            {review ? <ReviewDecisionBadge review={review} /> : null}
          </div>

          <div className="job-row-meta">
            <span>Salary: {formatSalary(job)}</span>
            <span>{formatLocationRemote(job)}</span>
            <span>Decision: {formatStateLabel(job.userDecision ?? "undecided")}</span>
            <span>Pipeline: {formatStateLabel(job.applicationStatus ?? "not_started")}</span>
          </div>

          <BadgeRow>
            <NextActionBadge nextAction={nextAction} />
            <SourceQualityBadge sourceQuality={job.sourceQuality} />
            <JobStatusBadge status={job.status} />
            {job.nextAction ? (
              <StatusBadge label={previewText(job.nextAction, 48)} tone="muted" />
            ) : null}
          </BadgeRow>

          {signal ? (
            <p className={`job-row-signal signal-${signal.tone}`}>
              <span>{signal.label}</span>
              {signal.text}
            </p>
          ) : null}

          {summary ? <p className="job-row-summary">{summary}</p> : null}
        </div>

        <div className="job-row-actions" aria-label={`${job.title} actions`}>
          <div className="job-row-action-group">
            <button
              className="button-primary button-small"
              disabled={primaryAction.disabled}
              type="button"
              onClick={primaryAction.run}
            >
              {primaryAction.label}
            </button>
            {primaryAction.kind !== "open" ? (
              <button className="button-secondary button-small" type="button" onClick={() => onOpenJob(job)}>
                Open
              </button>
            ) : null}
            {primaryAction.kind !== "review" && !sourceNeedsFullDescription(job) ? (
              <button
                className="button-secondary button-small"
                disabled={isBusy || !user}
                type="button"
                onClick={() => onRunReview(job.id)}
              >
                Review
              </button>
            ) : null}
            {primaryAction.kind !== "enrich" ? (
              <button
                className="button-secondary button-small"
                disabled={isBusy || !user}
                type="button"
                onClick={() => onEnrichJob(job)}
              >
                Enrich
              </button>
            ) : null}
          </div>

          <div className="job-row-action-group job-row-decision-actions">
            {decisionActions.map((action) => {
              const active = job.userDecision === action.decision;

              return (
                <button
                  aria-pressed={active}
                  className={`button-secondary button-small quick-decision${active ? " active" : ""}${
                    action.prominent ? " quick-decision-prominent" : ""
                  }`}
                  disabled={isBusy || !user}
                  key={action.decision}
                  type="button"
                  onClick={() => onQuickDecision(job.id, action.decision)}
                >
                  {action.label}
                </button>
              );
            })}
            <button
              className="button-danger button-small"
              disabled={isBusy || !user}
              type="button"
              onClick={() => onArchiveJob(job.id)}
            >
              Archive
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

export function JobQueuePanel({
  allJobs,
  jobs,
  totalJobs,
  activeFilter,
  selectedJobId,
  user,
  isBusy,
  onFilterChange,
  onOpenJob,
  onRunReview,
  onEnrichJob,
  onQuickDecision,
  onArchiveJob
}: JobQueuePanelProps) {
  const groups = groupJobsByQueueState(jobs).filter((group) => group.jobs.length > 0);
  const activeFilterInChips = queueFilterOptions.some((option) => option.filter === activeFilter);

  return (
    <section className="queue-panel" aria-label="Job Queue">
      <div className="section-heading">
        <div>
          <h3>Action Queue</h3>
          <p className="muted">
            {jobs.length} shown{jobs.length === totalJobs ? "" : ` from ${totalJobs}`} active jobs
          </p>
        </div>
      </div>

      <div className="queue-filter-row" role="tablist" aria-label="Job queue filters">
        {queueFilterOptions.map((option) => (
          <button
            aria-selected={activeFilter === option.filter}
            className={`filter-chip${activeFilter === option.filter ? " active" : ""}`}
            key={option.filter}
            role="tab"
            type="button"
            onClick={() => onFilterChange(option.filter)}
          >
            <span>{option.label}</span>
            <em>{queueFilterCount(allJobs, option.filter)}</em>
          </button>
        ))}
      </div>

      {!activeFilterInChips && activeFilter !== "all" ? (
        <div className="active-filter-banner">
          <span>Showing: {queueFilterLabels[activeFilter]}</span>
          <button
            className="button-secondary button-small"
            type="button"
            onClick={() => onFilterChange("all")}
          >
            Clear
          </button>
        </div>
      ) : null}

      {totalJobs === 0 ? <p className="muted">No active jobs yet.</p> : null}
      {totalJobs > 0 && jobs.length === 0 ? (
        <p className="muted queue-empty-message">{queueEmptyMessage(activeFilter)}</p>
      ) : null}

      <div className="queue-groups">
        {groups.map((group) => (
          <section className="queue-group" key={group.key}>
            <div className="queue-group-heading">
              <div>
                <h4>{group.label}</h4>
                <p className="muted">{group.description}</p>
              </div>
              <span className="queue-count">{group.jobs.length}</span>
            </div>

            <ul className="queue-list">
              {group.jobs.map((job) => (
                <JobQueueCard
                  isBusy={isBusy}
                  job={job}
                  key={job.id}
                  onArchiveJob={onArchiveJob}
                  onEnrichJob={onEnrichJob}
                  onOpenJob={onOpenJob}
                  onQuickDecision={onQuickDecision}
                  onRunReview={onRunReview}
                  selected={job.id === selectedJobId}
                  user={user}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
