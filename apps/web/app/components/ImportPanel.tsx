import { type FormEvent } from "react";

import {
  type GmailImportFormState,
  type GmailImportResult,
  type GmailStatus,
  type ImportFormState,
  type ImportedEmail,
  type ImportedEmailFormState,
  type Job,
  type User,
  extractedJobsStatus,
  formatDate,
  previewText,
  selectedEmailEmptyJobsMessage,
  selectedEmailJobCountText
} from "./types";

type ImportPanelProps = {
  importForm: ImportFormState;
  importedEmailForm: ImportedEmailFormState;
  gmailImportForm: GmailImportFormState;
  extractedJobs: Job[];
  importedEmailExtractedJobs: Job[];
  importWarnings: string[];
  importedEmailWarnings: string[];
  importedEmails: ImportedEmail[];
  selectedImportedEmail: ImportedEmail | null;
  gmailStatus: GmailStatus | null;
  gmailImportResult: GmailImportResult | null;
  user: User | null;
  isBusy: boolean;
  onExtractJobs: (event: FormEvent<HTMLFormElement>) => void;
  onSimulateImportedEmail: (event: FormEvent<HTMLFormElement>) => void;
  onImportFromGmail: (event: FormEvent<HTMLFormElement>) => void;
  onStartGmailOAuth: () => void;
  onDisconnectGmail: () => void;
  onRefreshImportedEmails: () => void | Promise<unknown>;
  onSelectImportedEmail: (email: ImportedEmail) => void;
  onExtractImportedEmail: (id: string) => void;
  onOpenJob: (job: Job) => void;
  updateImportField: (field: keyof ImportFormState, value: string) => void;
  updateImportedEmailField: (field: keyof ImportedEmailFormState, value: string) => void;
  updateGmailImportField: (field: keyof GmailImportFormState, value: string) => void;
};

export function ImportPanel({
  importForm,
  importedEmailForm,
  gmailImportForm,
  extractedJobs,
  importedEmailExtractedJobs,
  importWarnings,
  importedEmailWarnings,
  importedEmails,
  selectedImportedEmail,
  gmailStatus,
  gmailImportResult,
  user,
  isBusy,
  onExtractJobs,
  onSimulateImportedEmail,
  onImportFromGmail,
  onStartGmailOAuth,
  onDisconnectGmail,
  onRefreshImportedEmails,
  onSelectImportedEmail,
  onExtractImportedEmail,
  onOpenJob,
  updateImportField,
  updateImportedEmailField,
  updateGmailImportField
}: ImportPanelProps) {
  return (
    <section className="profile-panel">
      <div className="section-heading">
        <h2>Import</h2>
        <button disabled={isBusy || !user} type="button" onClick={() => void onRefreshImportedEmails()}>
          Refresh imports
        </button>
      </div>

      <form className="job-form" onSubmit={onExtractJobs}>
        <div className="section-heading">
          <h3>Paste Extraction</h3>
        </div>

        <div className="form-grid">
          <label>
            Source type
            <input
              value={importForm.sourceType}
              onChange={(event) => updateImportField("sourceType", event.target.value)}
            />
          </label>

          <label>
            Source name
            <input
              value={importForm.sourceName}
              onChange={(event) => updateImportField("sourceName", event.target.value)}
            />
          </label>

          <label className="wide">
            Pasted job or email text
            <textarea
              required
              value={importForm.sourceText}
              onChange={(event) => updateImportField("sourceText", event.target.value)}
              rows={12}
            />
          </label>
        </div>

        <div className="button-row">
          <button disabled={isBusy || !user || !importForm.sourceText.trim()} type="submit">
            Extract jobs
          </button>
        </div>
      </form>

      {importWarnings.length > 0 ? (
        <div className="description-block">
          <h3>Warnings</h3>
          <ul className="compact-list">
            {importWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="description-block">
        <h3>Created Jobs</h3>
        {extractedJobs.length === 0 ? <p className="muted">No imported jobs yet.</p> : null}
        <ul className="job-list">
          {extractedJobs.map((job) => (
            <li key={job.id}>
              <button type="button" onClick={() => onOpenJob(job)}>
                <span>
                  <strong>{job.title}</strong>
                  <small>{job.company}</small>
                </span>
                <span className="badge-row">
                  <em>{job.status}</em>
                  <em>{job.sourceQuality}</em>
                  <em>{job.applicationStatus ?? "not_started"}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section className="description-block">
        <div className="section-heading">
          <h3>Gmail Connection</h3>
          <span className="badge-row">
            <em>{gmailStatus?.connected ? "connected" : "disconnected"}</em>
          </span>
        </div>

        <dl className="detail-list">
          <div>
            <dt>Account</dt>
            <dd>{gmailStatus?.emailAddress ?? "Not connected"}</dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>{gmailStatus?.displayName ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Last import</dt>
            <dd>{formatDate(gmailStatus?.lastSyncAt ?? null)}</dd>
          </div>
        </dl>

        <div className="button-row">
          <button disabled={isBusy || !user} type="button" onClick={onStartGmailOAuth}>
            Connect Gmail
          </button>
          <button
            disabled={isBusy || !user || !gmailStatus?.connected}
            type="button"
            onClick={onDisconnectGmail}
          >
            Disconnect
          </button>
        </div>
      </section>

      <form className="job-form" onSubmit={onImportFromGmail}>
        <div className="section-heading">
          <h3>Gmail Import</h3>
        </div>

        <div className="form-grid">
          <label>
            Gmail query
            <input
              value={gmailImportForm.query}
              onChange={(event) => updateGmailImportField("query", event.target.value)}
            />
          </label>

          <label>
            Max results
            <input
              value={gmailImportForm.maxResults}
              onChange={(event) => updateGmailImportField("maxResults", event.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>

        <div className="button-row">
          <button disabled={isBusy || !user || !gmailStatus?.connected} type="submit">
            Import from Gmail
          </button>
        </div>
      </form>

      {gmailImportResult ? (
        <div className="description-block">
          <h3>Gmail Import Result</h3>
          <dl className="detail-list">
            <div>
              <dt>Imported</dt>
              <dd>{gmailImportResult.imported}</dd>
            </div>
            <div>
              <dt>Duplicates</dt>
              <dd>{gmailImportResult.duplicates}</dd>
            </div>
            <div>
              <dt>Query</dt>
              <dd>{gmailImportResult.query}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <form className="job-form" onSubmit={onSimulateImportedEmail}>
        <div className="section-heading">
          <h3>Simulated Email Import</h3>
        </div>

        <div className="form-grid">
          <label>
            Provider message ID
            <input
              required
              value={importedEmailForm.providerMessageId}
              onChange={(event) =>
                updateImportedEmailField("providerMessageId", event.target.value)
              }
            />
          </label>

          <label>
            From email
            <input
              value={importedEmailForm.fromEmail}
              onChange={(event) => updateImportedEmailField("fromEmail", event.target.value)}
              type="email"
            />
          </label>

          <label>
            From name
            <input
              value={importedEmailForm.fromName}
              onChange={(event) => updateImportedEmailField("fromName", event.target.value)}
            />
          </label>

          <label>
            Received at
            <input
              value={importedEmailForm.receivedAt}
              onChange={(event) => updateImportedEmailField("receivedAt", event.target.value)}
              type="datetime-local"
            />
          </label>

          <label>
            Subject
            <input
              required
              value={importedEmailForm.subject}
              onChange={(event) => updateImportedEmailField("subject", event.target.value)}
            />
          </label>

          <label>
            Label
            <input
              value={importedEmailForm.sourceLabel}
              onChange={(event) => updateImportedEmailField("sourceLabel", event.target.value)}
            />
          </label>

          <label className="wide">
            Email body
            <textarea
              required
              value={importedEmailForm.bodyText}
              onChange={(event) => updateImportedEmailField("bodyText", event.target.value)}
              rows={12}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            disabled={
              isBusy ||
              !user ||
              !importedEmailForm.providerMessageId.trim() ||
              !importedEmailForm.subject.trim() ||
              !importedEmailForm.bodyText.trim()
            }
            type="submit"
          >
            Simulate import
          </button>
        </div>
      </form>

      <div className="jobs-layout">
        <section>
          <h3>Import History</h3>
          {importedEmails.length === 0 ? <p className="muted">No imported emails yet.</p> : null}
          <ul className="job-list">
            {importedEmails.map((email) => (
              <li key={email.id}>
                <button type="button" onClick={() => onSelectImportedEmail(email)}>
                  <span>
                    <strong>{email.subject}</strong>
                    <small>
                      Email from {email.fromName || email.fromEmail || email.providerMessageId}
                    </small>
                    <small>
                      Preview: {email.snippet || previewText(email.bodyText ?? "") || "No preview saved."}
                    </small>
                  </span>
                  <span className="badge-row">
                    <em>Import: {email.importStatus}</em>
                    <em>Extraction: {email.extractionStatus}</em>
                    <em>{extractedJobsStatus(email)}</em>
                    {email.extractionStatus === "succeeded" ? <em>Processed</em> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="job-detail" aria-label="Imported email detail">
          {selectedImportedEmail ? (
            <>
              <div className="section-heading">
                <div>
                  <h3>{selectedImportedEmail.subject}</h3>
                  <p className="muted">
                    {selectedImportedEmail.fromName ||
                      selectedImportedEmail.fromEmail ||
                      "Unknown sender"}
                  </p>
                </div>
                <button
                  disabled={isBusy || !user || !selectedImportedEmail.bodyText?.trim()}
                  type="button"
                  onClick={() => onExtractImportedEmail(selectedImportedEmail.id)}
                >
                  {selectedImportedEmail.extractionStatus === "succeeded"
                    ? "Re-run extraction"
                    : "Extract jobs from email"}
                </button>
              </div>
              {selectedImportedEmail.extractionStatus === "succeeded" ? (
                <p className="muted">Extraction complete. Re-running will skip duplicates.</p>
              ) : null}

              <dl className="detail-list">
                <div>
                  <dt>From</dt>
                  <dd>
                    {selectedImportedEmail.fromName ||
                      selectedImportedEmail.fromEmail ||
                      "Unknown sender"}
                  </dd>
                </div>
                <div>
                  <dt>Message ID</dt>
                  <dd>{selectedImportedEmail.providerMessageId}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{formatDate(selectedImportedEmail.receivedAt)}</dd>
                </div>
                <div>
                  <dt>Label</dt>
                  <dd>{selectedImportedEmail.sourceLabel ?? "Not set"}</dd>
                </div>
                <div>
                  <dt>Import</dt>
                  <dd>{selectedImportedEmail.importStatus}</dd>
                </div>
                <div>
                  <dt>Extraction</dt>
                  <dd>{selectedImportedEmail.extractionStatus}</dd>
                </div>
                <div>
                  <dt>Extracted jobs</dt>
                  <dd>{selectedEmailJobCountText(selectedImportedEmail)}</dd>
                </div>
              </dl>

              {selectedImportedEmail.errorMessage ? (
                <div className="description-block">
                  <h4>Extraction Error</h4>
                  <p>{selectedImportedEmail.errorMessage}</p>
                </div>
              ) : null}

              <div className="description-block">
                <h4>Snippet</h4>
                <p>
                  {selectedImportedEmail.snippet ||
                    previewText(selectedImportedEmail.bodyText ?? "") ||
                    "No snippet saved."}
                </p>
              </div>

              {importedEmailWarnings.length > 0 ? (
                <div className="description-block">
                  <h4>Warnings</h4>
                  <ul className="compact-list">
                    {importedEmailWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="description-block">
                <h4>Created Jobs</h4>
                {importedEmailExtractedJobs.length === 0 ? (
                  <p className="muted">{selectedEmailEmptyJobsMessage(selectedImportedEmail)}</p>
                ) : null}
                <ul className="job-list">
                  {importedEmailExtractedJobs.map((job) => (
                    <li key={job.id}>
                      <button type="button" onClick={() => onOpenJob(job)}>
                        <span>
                          <strong>{job.title}</strong>
                          <small>{job.company}</small>
                        </span>
                        <span className="badge-row">
                          <em>{job.status}</em>
                          <em>{job.sourceQuality}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="muted">Select an imported email to view details.</p>
          )}
        </section>
      </div>
    </section>
  );
}
