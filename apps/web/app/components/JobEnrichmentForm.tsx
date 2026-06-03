import { type FormEvent } from "react";

import {
  type Job,
  type JobEnrichmentFormState,
  type User,
  enrichmentSourceQualityOptions
} from "./types";

type JobEnrichmentFormProps = {
  job: Job;
  form: JobEnrichmentFormState;
  user: User | null;
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAndReview: () => void;
  updateField: (field: keyof JobEnrichmentFormState, value: string) => void;
};

export function JobEnrichmentForm({
  job,
  form,
  user,
  isBusy,
  onSubmit,
  onSaveAndReview,
  updateField
}: JobEnrichmentFormProps) {
  const needsDescription = job.sourceQuality !== "full_description";

  return (
    <details className="detail-section" open={needsDescription}>
      <summary>
        <span>Enrichment</span>
        <small>{needsDescription ? "Full description needed" : "Full description saved"}</small>
      </summary>

      {needsDescription ? (
        <p className="muted">
          This job may only have an email summary. Paste the full description for better AI review.
        </p>
      ) : null}

      <form className="pipeline-form detail-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Original job URL
            <input
              value={form.url}
              onChange={(event) => updateField("url", event.target.value)}
              type="url"
            />
          </label>

          <label>
            Language
            <input
              value={form.language}
              onChange={(event) => updateField("language", event.target.value)}
            />
          </label>

          <label>
            Source quality
            <select
              value={form.sourceQuality}
              onChange={(event) => updateField("sourceQuality", event.target.value)}
            >
              {enrichmentSourceQualityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="wide">
            Full job description
            <textarea
              value={form.fullDescription}
              onChange={(event) => updateField("fullDescription", event.target.value)}
              rows={8}
            />
          </label>
        </div>

        <div className="button-row">
          <button disabled={isBusy || !user} type="submit">
            Save enriched details
          </button>
          <button disabled={isBusy || !user} type="button" onClick={onSaveAndReview}>
            Save and run AI review
          </button>
        </div>
      </form>
    </details>
  );
}
