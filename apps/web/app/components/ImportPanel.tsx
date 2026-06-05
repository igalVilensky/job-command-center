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
  const gmailConnected = Boolean(gmailStatus?.connected);
  const gmailStatusLabel = gmailConnected ? "Connected" : "Disconnected";

  return (
    <section className="profile-panel">
      <div className="section-heading">
        <h2>Imports</h2>
        <button disabled={isBusy || !user} type="button" onClick={() => void onRefreshImportedEmails()}>
          Refresh imports
        </button>
      </div>

      <details className="disclosure-panel">
        <summary>
          <span>Paste job text</span>
          <small>Manual fallback</small>
        </summary>

        <form className="job-form disclosure-form" onSubmit={onExtractJobs}>
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
                rows={10}
              />
            </label>
          </div>

          <div className="button-row">
            <button disabled={isBusy || !user || !importForm.sourceText.trim()} type="submit">
              Extract jobs
            </button>
          </div>
        </form>
      </details>

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
          <h3>Gmail</h3>
          <span className="badge-row" aria-label={`Gmail ${gmailStatusLabel}`}>
            <em className={gmailConnected ? "badge-success" : "badge-muted"}>
              {gmailStatusLabel}
            </em>
          </span>
        </div>

        {gmailConnected ? (
          <>
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
              <button
                className="button-danger"
                disabled={isBusy || !user}
                type="button"
                onClick={onDisconnectGmail}
              >
                Disconnect
              </button>
            </div>

            <form className="job-form gmail-import-form" onSubmit={onImportFromGmail}>
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
                <button disabled={isBusy || !user} type="submit">
                  Import from Gmail
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="connect-prompt">
            <p className="muted">Connect Gmail to import recent job alert emails.</p>
            <button
              className="button-primary"
              disabled={isBusy || !user}
              type="button"
              onClick={onStartGmailOAuth}
            >
              Connect Gmail
            </button>
          </div>
        )}
      </section>

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

      <details className="disclosure-panel">
        <summary>
          <span>Developer / simulated import</span>
          <small>Local testing only</small>
        </summary>

        <form className="job-form disclosure-form" onSubmit={onSimulateImportedEmail}>
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
                rows={10}
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
      </details>

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
            <details className="email-detail" open>
              <summary>
                <span>Selected email</span>
                <small>{selectedImportedEmail.extractionStatus}</small>
              </summary>

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
            </details>
          ) : (
            <p className="muted">Select an imported email to view details.</p>
          )}
        </section>
      </div>
    </section>
  );
}
