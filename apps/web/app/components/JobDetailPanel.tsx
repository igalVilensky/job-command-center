import { type FormEvent } from "react";

import { AiReviewPanel } from "./AiReviewPanel";
import { JobEnrichmentForm } from "./JobEnrichmentForm";
import { PipelineForm } from "./PipelineForm";
import {
  type Job,
  type JobDetailTab,
  type JobEnrichmentFormState,
  type PipelineFormState,
  type User,
  formatDate,
  formatLocationRemote,
  formatRemoteType,
  formatSalary,
  getJobNextAction,
  jobNeedsReview,
  sourceNeedsFullDescription
} from "./types";

type JobDetailPanelProps = {
  job: Job | null;
  activeTab: JobDetailTab;
  enrichmentForm: JobEnrichmentFormState;
  pipelineForm: PipelineFormState;
  user: User | null;
  isBusy: boolean;
  onBack: () => void;
  onTabChange: (tab: JobDetailTab) => void;
  onRunReview: (id: string) => void;
  onArchiveJob: (id: string) => void;
  onEnrichmentSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAndReview: () => void;
  onPipelineSave: (event: FormEvent<HTMLFormElement>) => void;
  onPipelineQuickSave: () => void;
  updateEnrichmentField: (field: keyof JobEnrichmentFormState, value: string) => void;
  updatePipelineField: (field: keyof PipelineFormState, value: string) => void;
};

const detailTabs: { key: JobDetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "review", label: "AI Review" },
  { key: "description", label: "Description" },
  { key: "pipeline", label: "Pipeline" },
  { key: "enrichment", label: "Enrichment" }
];

const recommendedActionText = (job: Job) => {
  if (sourceNeedsFullDescription(job)) {
    return "Paste the full job description before relying on fit analysis.";
  }

  if (jobNeedsReview(job)) {
    return "Run AI review to get a score, decision, fit breakdown, and questions.";
  }

  if (job.nextAction?.trim()) {
    return job.nextAction;
  }

  if (job.latestAiReview?.decision === "apply" || (job.latestAiReview?.score ?? 0) >= 75) {
    return "Decide whether to apply and save the next pipeline step.";
  }

  if (job.latestAiReview?.clarificationQuestions.length) {
    return "Resolve the highest-impact clarification questions before deciding.";
  }

  return "Keep this job in triage, move it into pipeline, or archive it.";
};

export function JobDetailPanel({
  job,
  activeTab,
  enrichmentForm,
  pipelineForm,
  user,
  isBusy,
  onBack,
  onTabChange,
  onRunReview,
  onArchiveJob,
  onEnrichmentSave,
  onSaveAndReview,
  onPipelineSave,
  onPipelineQuickSave,
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
  const summaryDescription = job.description?.summaryText ?? "";
  const isLongDescription = fullDescription.length > 1200;
  const review = job.latestAiReview;
  const pipelineFormId = `pipeline-form-${job.id}`;
  const primaryAction = sourceNeedsFullDescription(job)
    ? {
        label: "Enrich job",
        onClick: () => onTabChange("enrichment")
      }
    : jobNeedsReview(job)
      ? {
          label: "Run AI review",
          onClick: () => onRunReview(job.id)
        }
      : {
          label: "Save pipeline",
          onClick: onPipelineQuickSave
        };

  const topRiskFlags = review?.riskFlags.slice(0, 3) ?? [];
  const topQuestions = review?.clarificationQuestions.slice(0, 3) ?? [];

  return (
    <section className="job-detail-page" aria-label="Job detail">
      <header className="job-detail-header">
        <div className="detail-back-row">
          <button className="button-secondary" type="button" onClick={onBack}>
            Back to jobs
          </button>
        </div>

        <div className="detail-title-row">
          <div>
            <h2>{job.title}</h2>
            <p className="muted">{job.company}</p>
          </div>

          <span className="badge-row">
            {review ? (
              <em className="badge-accent">
                {review.score} / {review.decision}
              </em>
            ) : (
              <em className="badge-muted">No review</em>
            )}
            <em>{job.status}</em>
            <em>{job.sourceQuality}</em>
            <em className="badge-next">{getJobNextAction(job)}</em>
          </span>
        </div>

        <div className="button-row job-summary-actions">
          <button
            className="button-primary"
            disabled={isBusy || !user}
            type="button"
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </button>
          <button
            className="button-danger"
            disabled={isBusy || !user}
            type="button"
            onClick={() => onArchiveJob(job.id)}
          >
            Archive
          </button>
        </div>

        <dl className="detail-metrics">
          <div>
            <dt>Salary</dt>
            <dd>{formatSalary(job)}</dd>
          </div>
          <div>
            <dt>Location / remote</dt>
            <dd>{formatLocationRemote(job)}</dd>
          </div>
          <div>
            <dt>Decision</dt>
            <dd>{job.userDecision ?? "undecided"}</dd>
          </div>
          <div>
            <dt>Pipeline</dt>
            <dd>{job.applicationStatus ?? "not_started"}</dd>
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
      </header>

      <nav className="detail-tabs" aria-label="Job detail tabs">
        {detailTabs.map((tab) => (
          <button
            className={activeTab === tab.key ? "active" : ""}
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="detail-tab-panel">
        {activeTab === "overview" ? (
          <section className="overview-grid" aria-label="Overview">
            <div className="detail-section">
              <h4>Next recommended action</h4>
              <p>{recommendedActionText(job)}</p>
            </div>

            <div className="detail-section">
              <h4>Key metadata</h4>
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
                  <dt>Remote</dt>
                  <dd>{formatRemoteType(job.remoteType)}</dd>
                </div>
                <div>
                  <dt>Imported</dt>
                  <dd>{formatDate(job.importedAt)}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-section">
              <h4>Top risk flags</h4>
              {topRiskFlags.length > 0 ? (
                <ul className="compact-list">
                  {topRiskFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No reviewed risk flags yet.</p>
              )}
            </div>

            <div className="detail-section">
              <h4>Top clarification questions</h4>
              {topQuestions.length > 0 ? (
                <ul className="compact-list">
                  {topQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No reviewed clarification questions yet.</p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "review" ? (
          <AiReviewPanel isBusy={isBusy} job={job} onRunReview={onRunReview} user={user} />
        ) : null}

        {activeTab === "description" ? (
          <section className="detail-section" aria-label="Description">
            <div className="section-heading">
              <div>
                <h4>Description</h4>
                <p className="muted">
                  {fullDescription
                    ? `${fullDescription.length.toLocaleString()} characters`
                    : "Not saved"}
                </p>
              </div>
            </div>

            {summaryDescription ? (
              <div className="description-block">
                <h5>Summary</h5>
                <p>{summaryDescription}</p>
              </div>
            ) : null}

            {isLongDescription ? (
              <details className="inline-disclosure">
                <summary>Show full description</summary>
                <p>{fullDescription}</p>
              </details>
            ) : (
              <p>{fullDescription || "No full description saved."}</p>
            )}
          </section>
        ) : null}

        {activeTab === "pipeline" ? (
          <PipelineForm
            form={pipelineForm}
            formId={pipelineFormId}
            isBusy={isBusy}
            job={job}
            onSubmit={onPipelineSave}
            updateField={updatePipelineField}
            user={user}
          />
        ) : null}

        {activeTab === "enrichment" ? (
          <JobEnrichmentForm
            form={enrichmentForm}
            isBusy={isBusy}
            job={job}
            onSaveAndReview={onSaveAndReview}
            onSubmit={onEnrichmentSave}
            updateField={updateEnrichmentField}
            user={user}
          />
        ) : null}
      </section>
    </section>
  );
}
