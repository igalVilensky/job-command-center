import { type FormEvent, useMemo, useRef, useState } from "react";

import {
  type GmailImportFormState,
  type GmailImportResult,
  type GmailStatus,
  type ImportFormState,
  type ImportedEmail,
  type ImportedEmailFormState,
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type Job,
  type QueueFilter,
  type User,
  formatDate,
  previewText,
  selectedEmailEmptyJobsMessage,
  selectedEmailJobCountText
} from "./types";
import { JobAlertProcessingPanel } from "./JobAlertProcessingPanel";
import { JobSummaryRow } from "./JobSummaryRow";
import {
  BadgeRow,
  ExtractionStatusBadge,
  InboxStatusBadge,
  ImportStatusBadge,
  StatusBadge,
  getExtractionStatusTone,
  getInboxStatusTone
} from "./StatusBadge";

type ImportPanelProps = {
  importForm: ImportFormState;
  importedEmailForm: ImportedEmailFormState;
  gmailImportForm: GmailImportFormState;
  extractedJobs: Job[];
  importedEmailExtractedJobs: Job[];
  jobs: Job[];
  importWarnings: string[];
  importedEmailWarnings: string[];
  importedEmails: ImportedEmail[];
  processingForm: JobAlertProcessingFormState;
  processingSession: JobAlertProcessingSession | null;
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
  onTriageImportedEmail: (id: string, inboxStatus: string, triageReason?: string | null) => void;
  onOpenJob: (job: Job) => void;
  onOpenJobsFilter: (filter: QueueFilter) => void;
  onOpenImports: () => void;
  onStartProcessingSession: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshProcessingSession: () => void | Promise<unknown>;
  onCancelProcessingSession: () => void;
  updateImportField: (field: keyof ImportFormState, value: string) => void;
  updateImportedEmailField: (field: keyof ImportedEmailFormState, value: string) => void;
  updateGmailImportField: (field: keyof GmailImportFormState, value: string) => void;
  updateProcessingField: (field: keyof JobAlertProcessingFormState, value: string) => void;
};

type ImportInboxFilter =
  | "active"
  | "needs_check"
  | "paused_budget"
  | "processed"
  | "ignored"
  | "hidden"
  | "all";

const importInboxFilters: { id: ImportInboxFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "needs_check", label: "Needs manual check" },
  { id: "paused_budget", label: "Paused by budget" },
  { id: "processed", label: "Processed" },
  { id: "ignored", label: "Ignored / low signal" },
  { id: "hidden", label: "Hidden" },
  { id: "all", label: "All" }
];

const importedEmailSender = (email: ImportedEmail) =>
  email.fromName || email.fromEmail || email.providerMessageId;

const importedEmailPreview = (email: ImportedEmail) =>
  email.snippet || previewText(email.bodyText ?? "") || "No preview saved.";

const importedEmailIsActive = (email: ImportedEmail) =>
  email.extractionStatus === "failed" ||
  email.extractionStatus === "needs_manual_check" ||
  email.extractionStatus === "extraction_paused_budget" ||
  email.inboxStatus === "active" ||
  email.inboxStatus === "needs_check";

const importedEmailIsIgnored = (email: ImportedEmail) =>
  email.inboxStatus === "likely_irrelevant" || email.extractionStatus === "ignored_low_signal";

const importedEmailIsHidden = (email: ImportedEmail) => email.inboxStatus === "hidden";

const importedEmailSourceUrl = (email: ImportedEmail) => {
  const text = [email.snippet, email.bodyText].filter(Boolean).join(" ");
  const [match] = text.match(/https?:\/\/[^\s<>"')]+/i) ?? [];

  return match ?? null;
};

const importedEmailActionLabel = (email: ImportedEmail) => {
  if (
    email.inboxStatus === "processed" ||
    email.inboxStatus === "hidden" ||
    email.inboxStatus === "likely_irrelevant"
  ) {
    return "Extract anyway";
  }

  if (email.extractionStatus === "succeeded") {
    return "Re-run";
  }

  if (email.extractionStatus === "failed") {
    return "Retry extraction";
  }

  return "Extract jobs";
};

const emailNeedsPrimaryAction = (email: ImportedEmail) =>
  email.extractionStatus === "not_started" ||
  email.extractionStatus === "failed" ||
  email.extractionStatus === "needs_manual_check" ||
  email.extractionStatus === "extraction_paused_budget";

const importedEmailAiUsageLabel = (email: ImportedEmail) =>
  ["succeeded", "failed"].includes(email.extractionStatus) ? "AI used" : "AI not used";

const importedEmailNextAction = (email: ImportedEmail) => {
  if (email.extractionStatus === "extraction_paused_budget") {
    return "Wait/retry or extract anyway";
  }

  if (email.extractionStatus === "needs_manual_check" || email.inboxStatus === "needs_check") {
    return "Manual check";
  }

  if (email.extractionStatus === "ignored_low_signal") {
    return "Hide or extract anyway";
  }

  if (email.extractionStatus === "duplicate_source") {
    return "Restore only if needed";
  }

  if (email.extractionStatus === "succeeded" && email.jobCount > 0) {
    return "Open extracted jobs";
  }

  if (email.extractionStatus === "succeeded") {
    return "Keep hidden or re-run";
  }

  if (email.extractionStatus === "failed") {
    return "Retry extraction";
  }

  return "Extract anyway";
};

const importedEmailDetailsLabel = (email: ImportedEmail, selected: boolean) => {
  if (selected) {
    return "Selected";
  }

  if (email.extractionStatus === "succeeded" && email.jobCount > 0) {
    return "View jobs";
  }

  return "View details";
};

const matchesImportInboxFilter = (email: ImportedEmail, filter: ImportInboxFilter) => {
  if (filter === "active") {
    return importedEmailIsActive(email);
  }

  if (filter === "needs_check") {
    return email.inboxStatus === "needs_check" || email.extractionStatus === "needs_manual_check";
  }

  if (filter === "paused_budget") {
    return email.extractionStatus === "extraction_paused_budget";
  }

  if (filter === "processed") {
    return email.inboxStatus === "processed";
  }

  if (filter === "ignored") {
    return importedEmailIsIgnored(email);
  }

  if (filter === "hidden") {
    return importedEmailIsHidden(email);
  }

  return true;
};

const filteredInboxEmptyMessage = (
  importedEmailCount: number,
  filter: ImportInboxFilter,
  activeCount: number
) => {
  if (importedEmailCount === 0) {
    return "Import from Gmail to add job-alert emails.";
  }

  if (filter === "active" && activeCount === 0) {
    return "No active imported emails need attention.";
  }

  return "No emails match this filter.";
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
  jobs,
  importWarnings,
  importedEmailWarnings,
  importedEmails,
  processingForm,
  processingSession,
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
  onTriageImportedEmail,
  onOpenJob,
  onOpenJobsFilter,
  onOpenImports,
  onStartProcessingSession,
  onRefreshProcessingSession,
  onCancelProcessingSession,
  updateImportField,
  updateImportedEmailField,
  updateGmailImportField,
  updateProcessingField
}: ImportPanelProps) {
  const [activeInboxFilter, setActiveInboxFilter] = useState<ImportInboxFilter>("active");
  const selectedEmailDetailRef = useRef<HTMLElement | null>(null);
  const gmailConnected = Boolean(gmailStatus?.connected);
  const gmailStatusLabel = gmailConnected ? "Connected" : "Disconnected";
  const inboxCounts = useMemo(
    () => ({
      active: importedEmails.filter(importedEmailIsActive).length,
      needs_check: importedEmails.filter(
        (email) => email.inboxStatus === "needs_check" || email.extractionStatus === "needs_manual_check"
      ).length,
      paused_budget: importedEmails.filter(
        (email) => email.extractionStatus === "extraction_paused_budget"
      ).length,
      processed: importedEmails.filter((email) => email.inboxStatus === "processed").length,
      ignored: importedEmails.filter(importedEmailIsIgnored).length,
      hidden: importedEmails.filter(importedEmailIsHidden).length,
      all: importedEmails.length
    }),
    [importedEmails]
  );
  const filteredImportedEmails = useMemo(
    () => importedEmails.filter((email) => matchesImportInboxFilter(email, activeInboxFilter)),
    [activeInboxFilter, importedEmails]
  );
  const nextUnprocessedEmail = importedEmails.find(
    (email) =>
      importedEmailIsActive(email) &&
      (email.extractionStatus === "not_started" || email.extractionStatus === "failed")
  );
  const selectedEmailCreatedJobs = selectedImportedEmail
    ? [
        ...importedEmailExtractedJobs,
        ...jobs.filter(
          (job) =>
            job.importedEmailId === selectedImportedEmail.id &&
            !importedEmailExtractedJobs.some((extractedJob) => extractedJob.id === job.id)
        )
      ]
    : [];
  const selectedEmailVisibleJobCount = selectedEmailCreatedJobs.length;
  const selectedEmailSourceUrl = selectedImportedEmail
    ? importedEmailSourceUrl(selectedImportedEmail)
    : null;

  const focusSelectedEmailDetail = () => {
    window.requestAnimationFrame(() => {
      selectedEmailDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      selectedEmailDetailRef.current?.focus({ preventScroll: true });
    });
  };

  const selectEmailForDetail = (email: ImportedEmail) => {
    onSelectImportedEmail(email);
    focusSelectedEmailDetail();
  };

  const processNextImportedEmail = () => {
    if (!nextUnprocessedEmail) {
      return;
    }

    setActiveInboxFilter("active");
    onSelectImportedEmail(nextUnprocessedEmail);
    focusSelectedEmailDetail();
  };

  return (
    <section className="profile-panel">
      <div className="section-heading">
        <div>
          <h2>Imports</h2>
          <p className="muted">Source history for Gmail and pasted job-alert inputs.</p>
        </div>
        <button disabled={isBusy || !user} type="button" onClick={() => void onRefreshImportedEmails()}>
          Refresh imports
        </button>
      </div>

      <JobAlertProcessingPanel
        form={processingForm}
        isBusy={isBusy}
        onCancel={onCancelProcessingSession}
        onOpenImports={onOpenImports}
        onOpenJobsFilter={onOpenJobsFilter}
        onRefresh={onRefreshProcessingSession}
        onStart={onStartProcessingSession}
        session={processingSession}
        updateField={updateProcessingField}
        user={user}
      />

      <section className="gmail-compact-panel" aria-label="Gmail import">
        <div className="section-heading">
          <div>
            <h3>Gmail import</h3>
            <p className="muted">Import recent job-alert emails, then extract them when ready.</p>
          </div>
          <BadgeRow label={`Gmail ${gmailStatusLabel}`}>
            <StatusBadge label={gmailStatusLabel} tone={gmailConnected ? "success" : "muted"} />
          </BadgeRow>
        </div>

        {gmailConnected ? (
          <>
            <div className="gmail-status-line">
              <span>{gmailStatus?.emailAddress ?? "Connected account"}</span>
              <span>Last import: {formatDate(gmailStatus?.lastSyncAt ?? null)}</span>
              <button
                className="button-danger button-small"
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

            {gmailImportResult ? (
              <dl className="detail-list gmail-result-list">
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
            ) : null}
          </>
        ) : (
          <div className="connect-prompt">
            <p className="muted">Connect Gmail to import recent job-alert emails.</p>
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

      {extractedJobs.length > 0 ? (
        <div className="description-block">
          <h3>Created Jobs</h3>
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
        <section className="import-inbox-panel">
          <div className="section-heading">
            <div>
              <h3>Source history</h3>
              <p className="muted">Active and needs-check sources stay first; processed and ignored items are filters.</p>
            </div>
            <button
              className="button-primary"
              disabled={isBusy || !user || !nextUnprocessedEmail}
              type="button"
              onClick={processNextImportedEmail}
            >
              Process next
            </button>
          </div>

          <div className="inbox-filter-row" role="tablist" aria-label="Imported email filters">
            {importInboxFilters.map((filter) => (
              <button
                aria-selected={activeInboxFilter === filter.id}
                className={`filter-chip${activeInboxFilter === filter.id ? " active" : ""}`}
                key={filter.id}
                role="tab"
                type="button"
                onClick={() => setActiveInboxFilter(filter.id)}
              >
                <span>{filter.label}</span>
                <em>{inboxCounts[filter.id]}</em>
              </button>
            ))}
          </div>

          {filteredImportedEmails.length === 0 ? (
            <p className="muted inbox-empty-message">
              {filteredInboxEmptyMessage(
                importedEmails.length,
                activeInboxFilter,
                inboxCounts.active
              )}
            </p>
          ) : null}

          <ul className="email-list">
            {filteredImportedEmails.map((email) => {
              const selected = selectedImportedEmail?.id === email.id;
              const tone =
                email.extractionStatus === "failed"
                  ? getExtractionStatusTone(email.extractionStatus)
                  : getInboxStatusTone(email.inboxStatus);
              const canExtract = Boolean(user && email.bodyText?.trim());
              const sourceLabel = readableSourceLabel(email.sourceLabel);
              const needsPrimaryAction = emailNeedsPrimaryAction(email);
              const sourceUrl = importedEmailSourceUrl(email);
              const isHidden = importedEmailIsHidden(email);
              const isProcessed = email.inboxStatus === "processed";

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
                        <InboxStatusBadge status={email.inboxStatus} />
                        <StatusBadge label={email.prefilterDecision ?? "No prefilter"} tone="info" />
                        {email.jobLikelihoodScore !== null ? (
                          <StatusBadge label={`Score ${email.jobLikelihoodScore}`} tone="neutral" />
                        ) : null}
                        <StatusBadge
                          label={importedEmailAiUsageLabel(email)}
                          tone={importedEmailAiUsageLabel(email) === "AI used" ? "accent" : "muted"}
                        />
                        <StatusBadge label={importedEmailNextAction(email)} tone="warning" />
                        {sourceLabel ? (
                          <StatusBadge label={sourceLabel} tone="muted" />
                        ) : null}
                      </BadgeRow>

                      {email.triageReason ? (
                        <p className="email-triage-reason">{email.triageReason}</p>
                      ) : null}
                    </div>

                    <div className="email-import-actions">
                      {needsPrimaryAction ? (
                        <button
                          className="button-primary button-small"
                          disabled={isBusy || !canExtract}
                          type="button"
                          onClick={() => onExtractImportedEmail(email.id)}
                        >
                          {importedEmailActionLabel(email)}
                        </button>
                      ) : null}
                      {sourceUrl ? (
                        <a
                          className="button-link button-small"
                          href={sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open source
                        </a>
                      ) : null}
                      <button
                        className="button-secondary button-small"
                        type="button"
                        onClick={() => selectEmailForDetail(email)}
                      >
                        {importedEmailDetailsLabel(email, selected)}
                      </button>
                      {!needsPrimaryAction ? (
                        <button
                          className="button-secondary button-small"
                          disabled={isBusy || !canExtract}
                          type="button"
                          onClick={() => onExtractImportedEmail(email.id)}
                        >
                          {importedEmailActionLabel(email)}
                        </button>
                      ) : null}
                      {isHidden || isProcessed || email.inboxStatus === "needs_check" ? (
                        <button
                          className="button-secondary button-small"
                          disabled={isBusy || !user}
                          type="button"
                          onClick={() =>
                            onTriageImportedEmail(email.id, "active", "Kept active by user")
                          }
                        >
                          {isHidden ? "Restore" : "Keep active"}
                        </button>
                      ) : null}
                      {!isHidden ? (
                        <button
                          className="button-secondary button-small"
                          disabled={isBusy || !user}
                          type="button"
                          onClick={() =>
                            onTriageImportedEmail(email.id, "hidden", "Hidden manually")
                          }
                        >
                          Hide
                        </button>
                      ) : null}
                      {email.inboxStatus !== "likely_irrelevant" ? (
                        <button
                          className="button-secondary button-small"
                          disabled={isBusy || !user}
                          type="button"
                          onClick={() =>
                            onTriageImportedEmail(
                              email.id,
                              "likely_irrelevant",
                              "Marked likely irrelevant by user"
                            )
                          }
                        >
                          Mark irrelevant
                        </button>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="job-detail import-inbox-detail"
          aria-label="Imported email detail"
          ref={selectedEmailDetailRef}
          tabIndex={-1}
        >
          {selectedImportedEmail ? (
            <div className="email-detail">
              <div className="email-detail-heading">
                <div className="email-detail-title">
                  <span className="eyebrow">Selected email</span>
                  <h3>{selectedImportedEmail.subject || "No subject"}</h3>
                  <p className="muted">{importedEmailSender(selectedImportedEmail)}</p>
                </div>
                <ExtractionStatusBadge email={selectedImportedEmail} />
              </div>

              <div className="button-row email-detail-actions">
                <button
                  className={
                    emailNeedsPrimaryAction(selectedImportedEmail)
                      ? "button-primary"
                      : "button-secondary"
                  }
                  disabled={isBusy || !user || !selectedImportedEmail.bodyText?.trim()}
                  type="button"
                  onClick={() => onExtractImportedEmail(selectedImportedEmail.id)}
                >
                  {importedEmailActionLabel(selectedImportedEmail)}
                </button>
                {selectedEmailSourceUrl ? (
                  <a
                    className="button-link"
                    href={selectedEmailSourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open source
                  </a>
                ) : null}
                {selectedImportedEmail.inboxStatus !== "active" ? (
                  <button
                    className="button-secondary"
                    disabled={isBusy || !user}
                    type="button"
                    onClick={() =>
                      onTriageImportedEmail(
                        selectedImportedEmail.id,
                        "active",
                        "Kept active by user"
                      )
                    }
                  >
                    Restore / keep active
                  </button>
                ) : null}
                {selectedImportedEmail.inboxStatus !== "hidden" ? (
                  <button
                    className="button-secondary"
                    disabled={isBusy || !user}
                    type="button"
                    onClick={() =>
                      onTriageImportedEmail(
                        selectedImportedEmail.id,
                        "hidden",
                        "Hidden manually"
                      )
                    }
                  >
                    Hide
                  </button>
                ) : null}
                {selectedImportedEmail.inboxStatus !== "likely_irrelevant" ? (
                  <button
                    className="button-secondary"
                    disabled={isBusy || !user}
                    type="button"
                    onClick={() =>
                      onTriageImportedEmail(
                        selectedImportedEmail.id,
                        "likely_irrelevant",
                        "Marked likely irrelevant by user"
                      )
                    }
                  >
                    Mark likely irrelevant
                  </button>
                ) : null}
              </div>

              {selectedImportedEmail.extractionStatus === "succeeded" ? (
                <p className="muted">Extraction complete. Re-running will skip duplicates.</p>
              ) : null}

              <dl className="detail-list">
                <div>
                  <dt>Received</dt>
                  <dd>{formatDate(selectedImportedEmail.receivedAt)}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>
                    <BadgeRow>
                      <InboxStatusBadge status={selectedImportedEmail.inboxStatus} />
                      <ExtractionStatusBadge email={selectedImportedEmail} />
                      <StatusBadge
                        label={importedEmailAiUsageLabel(selectedImportedEmail)}
                        tone={
                          importedEmailAiUsageLabel(selectedImportedEmail) === "AI used"
                            ? "accent"
                            : "muted"
                        }
                      />
                    </BadgeRow>
                  </dd>
                </div>
                <div>
                  <dt>Prefilter</dt>
                  <dd>
                    <BadgeRow>
                      <StatusBadge
                        label={selectedImportedEmail.prefilterDecision ?? "No prefilter"}
                        tone="info"
                      />
                      {selectedImportedEmail.jobLikelihoodScore !== null ? (
                        <StatusBadge
                          label={`Score ${selectedImportedEmail.jobLikelihoodScore}`}
                          tone="neutral"
                        />
                      ) : null}
                    </BadgeRow>
                  </dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>{importedEmailNextAction(selectedImportedEmail)}</dd>
                </div>
                <div>
                  <dt>Reason</dt>
                  <dd>
                    {selectedImportedEmail.prefilterJson?.reason ??
                      selectedImportedEmail.triageReason ??
                      "No triage reason saved."}
                  </dd>
                </div>
                <div>
                  <dt>Extracted jobs</dt>
                  <dd>
                    {selectedEmailJobCountText(selectedImportedEmail)}
                    {selectedEmailVisibleJobCount > 0
                      ? ` (${selectedEmailVisibleJobCount} shown)`
                      : ""}
                  </dd>
                </div>
              </dl>

              {selectedImportedEmail.errorMessage ? (
                <details className="inline-disclosure">
                  <summary>Technical extraction error</summary>
                  <p>{selectedImportedEmail.errorMessage}</p>
                </details>
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
                {selectedEmailCreatedJobs.length === 0 ? (
                  <p className="muted">{selectedEmailEmptyJobsMessage(selectedImportedEmail)}</p>
                ) : null}
                <ul className="queue-list">
                  {selectedEmailCreatedJobs.map((job) => (
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
            </div>
          ) : (
            <div className="empty-detail-state">
              <h3>No email selected</h3>
              <p className="muted">Select an imported email or use Process next.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
