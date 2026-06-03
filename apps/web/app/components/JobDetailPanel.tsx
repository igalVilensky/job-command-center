import { type FormEvent } from "react";

import { AiReviewPanel } from "./AiReviewPanel";
import { JobEnrichmentForm } from "./JobEnrichmentForm";
import { PipelineForm } from "./PipelineForm";
import {
  type Job,
  type JobEnrichmentFormState,
  type PipelineFormState,
  type User,
  formatRemoteType,
  formatSalary
} from "./types";

type JobDetailPanelProps = {
  job: Job | null;
  enrichmentForm: JobEnrichmentFormState;
  pipelineForm: PipelineFormState;
  user: User | null;
  isBusy: boolean;
  onRunReview: (id: string) => void;
  onArchiveJob: (id: string) => void;
  onEnrichmentSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAndReview: () => void;
  onPipelineSave: (event: FormEvent<HTMLFormElement>) => void;
  updateEnrichmentField: (field: keyof JobEnrichmentFormState, value: string) => void;
  updatePipelineField: (field: keyof PipelineFormState, value: string) => void;
};

export function JobDetailPanel({
  job,
  enrichmentForm,
  pipelineForm,
  user,
  isBusy,
  onRunReview,
  onArchiveJob,
  onEnrichmentSave,
  onSaveAndReview,
  onPipelineSave,
  updateEnrichmentField,
  updatePipelineField
}: JobDetailPanelProps) {
  if (!job) {
    return (
      <section className="job-detail focused-detail" aria-label="Job detail">
        <p className="muted">Select a job to view details.</p>
      </section>
    );
  }

  const fullDescription = job.description?.fullText ?? "";
  const isLongDescription = fullDescription.length > 1200;

  return (
    <section className="job-detail focused-detail" aria-label="Job detail">
      <section className="detail-section">
        <div className="section-heading">
          <div>
            <h3>{job.title}</h3>
            <p className="muted">{job.company}</p>
          </div>
          <span className="badge-row">
            <em>{job.status}</em>
            <em>{job.sourceQuality}</em>
          </span>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Status</dt>
            <dd>{job.status}</dd>
          </div>
          <div>
            <dt>Source quality</dt>
            <dd>{job.sourceQuality}</dd>
          </div>
          <div>
            <dt>Salary</dt>
            <dd>{formatSalary(job)}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{job.location ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Remote</dt>
            <dd>{formatRemoteType(job.remoteType)}</dd>
          </div>
          <div>
            <dt>URL</dt>
            <dd>
              {job.url ? (
                <a href={job.url} rel="noreferrer" target="_blank">
                  {job.url}
                </a>
              ) : (
                "Not listed"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="detail-section primary-actions">
        <div className="section-heading">
          <h4>Primary actions</h4>
        </div>
        <div className="button-row">
          <button disabled={isBusy || !user} type="button" onClick={() => onRunReview(job.id)}>
            Run AI review
          </button>
          <button disabled={isBusy || !user} type="button" onClick={() => onArchiveJob(job.id)}>
            Archive
          </button>
        </div>
      </section>

      <JobEnrichmentForm
        form={enrichmentForm}
        isBusy={isBusy}
        job={job}
        onSaveAndReview={onSaveAndReview}
        onSubmit={onEnrichmentSave}
        updateField={updateEnrichmentField}
        user={user}
      />

      <AiReviewPanel isBusy={isBusy} job={job} onRunReview={onRunReview} user={user} />

      <PipelineForm
        form={pipelineForm}
        isBusy={isBusy}
        job={job}
        onSubmit={onPipelineSave}
        updateField={updatePipelineField}
        user={user}
      />

      <details className="detail-section" open={!isLongDescription}>
        <summary>
          <span>Full description</span>
          <small>{fullDescription ? `${fullDescription.length.toLocaleString()} characters` : "Not saved"}</small>
        </summary>
        <p>{fullDescription || "No full description saved."}</p>
      </details>
    </section>
  );
}
