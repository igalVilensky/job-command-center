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
  getJobActionPlan,
  getJobNextAction
} from "./types";
import {
  BadgeRow,
  formatStateLabel,
  JobStatusBadge,
  NextActionBadge,
  ReviewDecisionBadge,
  SourceQualityBadge
} from "./StatusBadge";

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

const checklistStatusLabel = (status: "done" | "todo" | "warning") => {
  if (status === "done") {
    return "Done";
  }

  if (status === "warning") {
    return "Check";
  }

  return "To do";
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
  const actionPlan = getJobActionPlan(job);
  const pipelineFormId = `pipeline-form-${job.id}`;
  const runActionPlanPrimary = () => {
    if (actionPlan.primaryAction.kind === "enrich") {
      onTabChange("enrichment");
      return;
    }

    if (actionPlan.primaryAction.kind === "review") {
      onRunReview(job.id);
      return;
    }

    if (actionPlan.primaryAction.kind === "clarify") {
      onTabChange("review");
      return;
    }

    if (
      actionPlan.primaryAction.kind === "apply" ||
      actionPlan.primaryAction.kind === "decide" ||
      actionPlan.primaryAction.kind === "follow_up" ||
      actionPlan.primaryAction.kind === "none"
    ) {
      onTabChange("pipeline");
    }
  };
  const primaryActionDisabled =
    actionPlan.primaryAction.kind === "review" ? isBusy || !user : false;

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

          <BadgeRow>
            <ReviewDecisionBadge review={review} />
            <JobStatusBadge status={job.status} />
            <SourceQualityBadge sourceQuality={job.sourceQuality} />
            <NextActionBadge nextAction={getJobNextAction(job)} />
          </BadgeRow>
        </div>

        <div className="button-row job-summary-actions">
          {actionPlan.primaryAction.kind === "none" ? (
            <button className="button-secondary" type="button" onClick={() => onTabChange("pipeline")}>
              View pipeline
            </button>
          ) : (
            <button
              className="button-primary"
              disabled={primaryActionDisabled}
              type="button"
              onClick={runActionPlanPrimary}
            >
              {actionPlan.primaryAction.label}
            </button>
          )}
          {actionPlan.primaryAction.kind !== "enrich" &&
          actionPlan.primaryAction.kind !== "review" ? (
            <button
              className="button-secondary"
              disabled={isBusy || !user}
              type="button"
              onClick={onPipelineQuickSave}
            >
              Save pipeline
            </button>
          ) : null}
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
            <dd>{formatStateLabel(job.userDecision ?? "undecided")}</dd>
          </div>
          <div>
            <dt>Pipeline</dt>
            <dd>{formatStateLabel(job.applicationStatus ?? "not_started")}</dd>
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
            <section className="detail-section action-plan-card">
              <div className="section-heading">
                <div>
                  <h4>Action Plan</h4>
                  <p className="muted">{actionPlan.primaryAction.description}</p>
                </div>
                {actionPlan.primaryAction.kind === "none" ? (
                  <button className="button-secondary" type="button" onClick={() => onTabChange("pipeline")}>
                    View pipeline
                  </button>
                ) : (
                  <button
                    className="button-primary"
                    disabled={primaryActionDisabled}
                    type="button"
                    onClick={runActionPlanPrimary}
                  >
                    {actionPlan.primaryAction.label}
                  </button>
                )}
              </div>

              <ul className="action-plan-checklist" aria-label="Action plan checklist">
                {actionPlan.checklist.map((item) => (
                  <li className={`checklist-${item.status}`} key={`${item.status}-${item.label}`}>
                    <span>{item.label}</span>
                    <em>{checklistStatusLabel(item.status)}</em>
                  </li>
                ))}
              </ul>

              {actionPlan.blockers.length > 0 ? (
                <div className="action-plan-block">
                  <h5>Blockers / risks</h5>
                  <ul className="compact-list">
                    {actionPlan.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {actionPlan.nextQuestions.length > 0 ? (
                <div className="action-plan-block">
                  <h5>Questions to answer</h5>
                  <ul className="compact-list">
                    {actionPlan.nextQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <div className="detail-section">
              <h4>Key metadata</h4>
              <dl className="detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <BadgeRow>
                      <JobStatusBadge status={job.status} />
                    </BadgeRow>
                  </dd>
                </div>
                <div>
                  <dt>Source quality</dt>
                  <dd>
                    <BadgeRow>
                      <SourceQualityBadge sourceQuality={job.sourceQuality} />
                    </BadgeRow>
                  </dd>
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
