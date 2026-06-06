import {
  type Job,
  type User,
  formatLocationRemote,
  formatSalary,
  getJobNextAction,
  groupJobsByQueueState,
  previewText
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
  jobs: Job[];
  totalJobs: number;
  selectedJobId: string | null;
  user: User | null;
  isBusy: boolean;
  onOpenJob: (job: Job) => void;
  onRunReview: (id: string) => void;
  onEnrichJob: (job: Job) => void;
  onArchiveJob: (id: string) => void;
};

function JobQueueCard({
  job,
  selected,
  user,
  isBusy,
  onOpenJob,
  onRunReview,
  onEnrichJob,
  onArchiveJob
}: {
  job: Job;
  selected: boolean;
  user: User | null;
  isBusy: boolean;
  onOpenJob: (job: Job) => void;
  onRunReview: (id: string) => void;
  onEnrichJob: (job: Job) => void;
  onArchiveJob: (id: string) => void;
}) {
  const review = job.latestAiReview;
  const nextAction = getJobNextAction(job);

  return (
    <li>
      <article className={`job-row${selected ? " selected" : ""}`}>
        <div className="job-row-main">
          <div>
            <strong>{job.title}</strong>
            <small>{job.company}</small>
          </div>

          <div className="job-row-meta">
            <span>Salary: {formatSalary(job)}</span>
            <span>{formatLocationRemote(job)}</span>
            <span>Status: {formatStateLabel(job.status)}</span>
            <span>Pipeline: {formatStateLabel(job.applicationStatus ?? "not_started")}</span>
          </div>

          <BadgeRow>
            <ReviewDecisionBadge review={review} />
            <SourceQualityBadge sourceQuality={job.sourceQuality} />
            <JobStatusBadge status={job.status} />
            <NextActionBadge nextAction={nextAction} />
            {job.nextAction ? (
              <StatusBadge label={previewText(job.nextAction, 48)} tone="muted" />
            ) : null}
          </BadgeRow>
        </div>

        <div className="job-row-actions">
          <button className="button-primary" type="button" onClick={() => onOpenJob(job)}>
            Open
          </button>
          <button
            className="button-secondary button-small"
            disabled={isBusy || !user}
            type="button"
            onClick={() => onRunReview(job.id)}
          >
            Review
          </button>
          <button
            className="button-secondary button-small"
            disabled={isBusy || !user}
            type="button"
            onClick={() => onEnrichJob(job)}
          >
            Enrich
          </button>
          <button
            className="button-danger button-small"
            disabled={isBusy || !user}
            type="button"
            onClick={() => onArchiveJob(job.id)}
          >
            Archive
          </button>
        </div>
      </article>
    </li>
  );
}

export function JobQueuePanel({
  jobs,
  totalJobs,
  selectedJobId,
  user,
  isBusy,
  onOpenJob,
  onRunReview,
  onEnrichJob,
  onArchiveJob
}: JobQueuePanelProps) {
  const groups = groupJobsByQueueState(jobs);

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

      {totalJobs === 0 ? <p className="muted">No active jobs yet.</p> : null}
      {totalJobs > 0 && jobs.length === 0 ? (
        <p className="muted">No jobs match the selected filters.</p>
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
