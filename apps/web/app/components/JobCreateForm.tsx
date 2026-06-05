import { type FormEvent } from "react";

import { type JobFormState, remoteTypeOptions } from "./types";

type JobCreateFormProps = {
  form: JobFormState;
  isBusy: boolean;
  canCreate: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  updateField: (field: keyof JobFormState, value: string) => void;
};

export function JobCreateForm({
  form,
  isBusy,
  canCreate,
  onSubmit,
  onCancel,
  updateField
}: JobCreateFormProps) {
  return (
    <section className="manual-job-panel" aria-label="New job">
      <div className="section-heading">
        <div>
          <h3>New job</h3>
          <p className="muted">Create a job manually when it did not arrive from an import.</p>
        </div>
        <button className="button-secondary" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="job-form manual-job-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Company
            <input
              required
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
            />
          </label>

          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label>
            Location
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
            />
          </label>

          <label>
            Remote type
            <select value={form.remoteType} onChange={(event) => updateField("remoteType", event.target.value)}>
              {remoteTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Salary text
            <input
              value={form.salaryText}
              onChange={(event) => updateField("salaryText", event.target.value)}
            />
          </label>

          <label>
            URL
            <input
              value={form.url}
              onChange={(event) => updateField("url", event.target.value)}
              type="url"
            />
          </label>

          <label className="wide">
            Full description
            <textarea
              value={form.fullDescription}
              onChange={(event) => updateField("fullDescription", event.target.value)}
              rows={6}
            />
          </label>
        </div>

        <div className="button-row">
          <button disabled={isBusy || !canCreate} type="submit">
            Create job
          </button>
        </div>
      </form>
    </section>
  );
}
