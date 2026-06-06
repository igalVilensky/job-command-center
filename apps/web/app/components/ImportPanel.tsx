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
  formatDate,
  previewText,
  selectedEmailEmptyJobsMessage,
  selectedEmailJobCountText
} from "./types";
import { JobSummaryRow } from "./JobSummaryRow";
import {
  BadgeRow,
  ExtractionStatusBadge,
  ImportStatusBadge,
  StatusBadge,
  getExtractionStatusTone
} from "./StatusBadge";

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

const importedEmailSender = (email: ImportedEmail) =>
  email.fromName || email.fromEmail || email.providerMessageId;

const importedEmailPreview = (email: ImportedEmail) =>
  email.snippet || previewText(email.bodyText ?? "") || "No preview saved.";

const importedEmailActionLabel = (email: ImportedEmail) => {
  if (email.extractionStatus === "succeeded") {
    return "Re-run extraction";
  }

  if (email.extractionStatus === "failed") {
    return "Retry extraction";
  }

  return "Extract jobs";
};

const noisyGmailLabels = new Set([
  "CATEGORY_FORUMS",
  "CATEGORY_PERSONAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_SOCIAL",
  "CATEGORY_UPDATES",
  "CHAT",
  "DRAFT",
  "IMPORTANT",
  "INBOX",
  "SENT",
  "SPAM",
  "STARRED",
  "TRASH",
  "UNREAD"
]);

const readableSourceLabel = (sourceLabel: string | null) => {
  const readableLabels = (sourceLabel ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label) => !noisyGmailLabels.has(label) && !/^Label_\d+$/i.test(label))
    .map((label) =>
      label
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  return readableLabels.length > 0 ? readableLabels.join(", ") : null;
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
        <ul className="queue-list">
          {extractedJobs.map((job) => (
            <JobSummaryRow
              actionLabel="Open job"
              job={job}
              key={job.id}
              onOpenJob={onOpenJob}
              showMeta={false}
            />
          ))}
        </ul>
      </div>

      <section className="description-block">
        <div className="section-heading">
          <h3>Gmail</h3>
          <BadgeRow label={`Gmail ${gmailStatusLabel}`}>
            <StatusBadge label={gmailStatusLabel} tone={gmailConnected ? "success" : "muted"} />
          </BadgeRow>
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
          <ul className="email-list">
            {importedEmails.map((email) => {
              const selected = selectedImportedEmail?.id === email.id;
              const tone = getExtractionStatusTone(email.extractionStatus);
              const canExtract = Boolean(user && email.bodyText?.trim());
              const sourceLabel = readableSourceLabel(email.sourceLabel);

              return (
                <li key={email.id}>
                  <article
                    className={`email-import-card email-tone-${tone}${selected ? " selected" : ""}`}
                  >
                    <span className="email-status-rail" aria-hidden="true" />

                    <div className="email-import-main">
                      <div className="email-import-title-row">
                        <div>
                          <strong>{email.subject || "No subject"}</strong>
                          <small>
                            {importedEmailSender(email)} · {formatDate(email.receivedAt)}
                          </small>
                        </div>
                        <ExtractionStatusBadge email={email} />
                      </div>

                      <p className="email-preview">{importedEmailPreview(email)}</p>

                      <BadgeRow className="email-badges">
                        <ImportStatusBadge status={email.importStatus} />
                        {sourceLabel ? (
                          <StatusBadge label={sourceLabel} tone="muted" />
                        ) : null}
                      </BadgeRow>
                    </div>

                    <div className="email-import-actions">
                      <button
                        className="button-primary button-small"
                        disabled={isBusy || !canExtract}
                        type="button"
                        onClick={() => onExtractImportedEmail(email.id)}
                      >
                        {importedEmailActionLabel(email)}
                      </button>
                      <button
                        className="button-secondary button-small"
                        type="button"
                        onClick={() => onSelectImportedEmail(email)}
                      >
                        {selected ? "Selected" : "View details"}
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="job-detail" aria-label="Imported email detail">
          {selectedImportedEmail ? (
            <details className="email-detail" open>
              <summary>
                <span>Selected email</span>
                <ExtractionStatusBadge email={selectedImportedEmail} />
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
                  {importedEmailActionLabel(selectedImportedEmail)}
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
                  <dd>{readableSourceLabel(selectedImportedEmail.sourceLabel) ?? "Not set"}</dd>
                </div>
                <div>
                  <dt>Import</dt>
                  <dd>
                    <BadgeRow>
                      <ImportStatusBadge status={selectedImportedEmail.importStatus} />
                    </BadgeRow>
                  </dd>
                </div>
                <div>
                  <dt>Extraction</dt>
                  <dd>
                    <BadgeRow>
                      <ExtractionStatusBadge email={selectedImportedEmail} />
                    </BadgeRow>
                  </dd>
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
                <ul className="queue-list">
                  {importedEmailExtractedJobs.map((job) => (
                    <JobSummaryRow
                      actionLabel="Open job"
                      job={job}
                      key={job.id}
                      onOpenJob={onOpenJob}
                      showMeta={false}
                    />
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
