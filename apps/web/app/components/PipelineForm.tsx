import { type FormEvent } from "react";

import {
  type Job,
  type PipelineFormState,
  type User,
  applicationStatusOptions,
  formatDate,
  userDecisionOptions
} from "./types";

type PipelineFormProps = {
  job: Job;
  form: PipelineFormState;
  formId?: string;
  user: User | null;
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateField: (field: keyof PipelineFormState, value: string) => void;
};

export function PipelineForm({
  job,
  form,
  formId,
  user,
  isBusy,
  onSubmit,
  updateField
}: PipelineFormProps) {
  return (
    <section className="detail-section pipeline-section" aria-label="Pipeline">
      <div className="section-heading">
        <div>
          <h4>Pipeline</h4>
          <p className="muted">{job.applicationStatus ?? "not_started"}</p>
        </div>
      </div>

      <form className="pipeline-form detail-form" id={formId} onSubmit={onSubmit}>
        <div className="section-heading">
          <button disabled={isBusy || !user} type="submit">
            Save pipeline
          </button>
        </div>

        <div className="form-grid">
          <label>
            User decision
            <select
              value={form.userDecision}
              onChange={(event) => updateField("userDecision", event.target.value)}
            >
              {userDecisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Application status
            <select
              value={form.applicationStatus}
              onChange={(event) => updateField("applicationStatus", event.target.value)}
            >
              {applicationStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="wide">
            User notes
            <textarea
              value={form.userNotes}
              onChange={(event) => updateField("userNotes", event.target.value)}
              rows={4}
            />
          </label>

          <label className="wide">
            Next action
            <textarea
              value={form.nextAction}
              onChange={(event) => updateField("nextAction", event.target.value)}
              rows={3}
            />
          </label>

          <label>
            Follow-up date
            <input
              value={form.followUpDate}
              onChange={(event) => updateField("followUpDate", event.target.value)}
              type="date"
            />
          </label>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Applied at</dt>
            <dd>{formatDate(job.appliedAt)}</dd>
          </div>
          <div>
            <dt>Rejected at</dt>
            <dd>{formatDate(job.rejectedAt)}</dd>
          </div>
        </dl>
      </form>
    </section>
  );
}
