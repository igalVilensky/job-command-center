import {
  type Job,
  formatLocationRemote,
  formatSalary,
  getJobNextAction,
  previewText
} from "./types";
import {
  BadgeRow,
  JobStatusBadge,
  NextActionBadge,
  ReviewDecisionBadge,
  SourceQualityBadge,
  StatusBadge
} from "./StatusBadge";

type JobSummaryRowProps = {
  job: Job;
  onOpenJob: (job: Job) => void;
  actionLabel?: string;
  selected?: boolean;
  showReview?: boolean;
  showMeta?: boolean;
};

export function JobSummaryRow({
  job,
  onOpenJob,
  actionLabel = "Open job",
  selected = false,
  showReview = false,
  showMeta = true
}: JobSummaryRowProps) {
  const nextAction = getJobNextAction(job);

  return (
    <li>
      <article className={`job-row job-summary-row${selected ? " selected" : ""}`}>
        <div className="job-row-main">
          <div>
            <strong>{job.title}</strong>
            <small>{job.company}</small>
          </div>

          {showMeta ? (
            <div className="job-row-meta">
              <span>Salary: {formatSalary(job)}</span>
              <span>{formatLocationRemote(job)}</span>
            </div>
          ) : null}

          <BadgeRow>
            {showReview ? <ReviewDecisionBadge review={job.latestAiReview} /> : null}
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
            {actionLabel}
          </button>
        </div>
      </article>
    </li>
  );
}
