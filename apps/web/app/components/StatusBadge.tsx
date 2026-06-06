import { type ReactNode } from "react";

import { type AiReview, type ImportedEmail } from "./types";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "muted";

type BadgeSpec = {
  label: string;
  tone: BadgeTone;
  title?: string;
};

type StatusBadgeProps = BadgeSpec & {
  className?: string;
};

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatStateLabel = (value: string | null | undefined, fallback = "Unknown") =>
  value ? titleCase(value) : fallback;

const withFallback = (
  value: string | null | undefined,
  map: Record<string, BadgeSpec>,
  fallbackTone: BadgeTone = "neutral"
): BadgeSpec => {
  if (!value) {
    return { label: "Unknown", tone: fallbackTone };
  }

  return map[value] ?? { label: formatStateLabel(value), tone: fallbackTone };
};

const pluralJobs = (count: number) => `${count} job${count === 1 ? "" : "s"}`;

export function StatusBadge({ label, tone, title, className }: StatusBadgeProps) {
  return (
    <em className={`status-badge badge-${tone}${className ? ` ${className}` : ""}`} title={title}>
      {label}
    </em>
  );
}

export function BadgeRow({
  children,
  className,
  label
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <span className={`badge-row${className ? ` ${className}` : ""}`} aria-label={label}>
      {children}
    </span>
  );
}

export const sourceQualityBadgeSpec = (sourceQuality: string | null | undefined) =>
  withFallback(
    sourceQuality,
    {
      full_description: { label: "Full description", tone: "success" },
      partial_description: { label: "Partial description", tone: "warning" },
      email_summary: { label: "Email summary", tone: "info" },
      digest_summary: { label: "Digest summary", tone: "info" },
      manual_note: { label: "Manual note", tone: "neutral" },
      unknown: { label: "Unknown source", tone: "neutral" }
    },
    "neutral"
  );

export function SourceQualityBadge({ sourceQuality }: { sourceQuality: string | null | undefined }) {
  return <StatusBadge {...sourceQualityBadgeSpec(sourceQuality)} />;
}

export const jobStatusBadgeSpec = (status: string | null | undefined) =>
  withFallback(
    status,
    {
      imported: { label: "Imported", tone: "info" },
      needs_full_description: { label: "Needs description", tone: "warning" },
      ready_for_analysis: { label: "Ready for review", tone: "accent" },
      analyzed: { label: "Analyzed", tone: "success" },
      archived: { label: "Archived", tone: "muted" },
      failed: { label: "Failed", tone: "danger" }
    },
    "neutral"
  );

export function JobStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge {...jobStatusBadgeSpec(status)} />;
}

export const nextActionBadgeSpec = (nextAction: string | null | undefined) =>
  withFallback(
    nextAction,
    {
      Enrich: { label: "Enrich", tone: "warning" },
      Review: { label: "Review", tone: "accent" },
      "Follow up": { label: "Follow up", tone: "info" },
      Decide: { label: "Decide", tone: "success" },
      Clarify: { label: "Clarify", tone: "warning" },
      Pipeline: { label: "Pipeline", tone: "info" },
      Triage: { label: "Triage", tone: "neutral" }
    },
    "neutral"
  );

export function NextActionBadge({ nextAction }: { nextAction: string | null | undefined }) {
  return <StatusBadge {...nextActionBadgeSpec(nextAction)} />;
}

export const reviewDecisionBadgeSpec = (
  decision: string | null | undefined,
  score?: number | null
) => {
  const prefix = typeof score === "number" ? `${score} · ` : "";
  const spec = withFallback(
    decision,
    {
      apply: { label: "Apply", tone: "success" },
      maybe: { label: "Maybe", tone: "warning" },
      review_manually: { label: "Manual review", tone: "warning" },
      skip: { label: "Skip", tone: "muted" },
      unknown: { label: "Unknown decision", tone: "neutral" }
    },
    "neutral"
  );

  return { ...spec, label: `${prefix}${spec.label}` };
};

export function ReviewDecisionBadge({ review }: { review: AiReview | null | undefined }) {
  if (!review) {
    return <StatusBadge label="No review" tone="muted" />;
  }

  return <StatusBadge {...reviewDecisionBadgeSpec(review.decision, review.score)} />;
}

export const importStatusBadgeSpec = (status: string | null | undefined) =>
  withFallback(
    status,
    {
      imported: { label: "Imported", tone: "info" },
      processed: { label: "Processed", tone: "success" },
      duplicate: { label: "Duplicate", tone: "muted" },
      duplicates: { label: "Duplicates", tone: "muted" },
      skipped: { label: "Skipped", tone: "muted" }
    },
    "neutral"
  );

export function ImportStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge {...importStatusBadgeSpec(status)} />;
}

export const extractionStatusBadgeSpec = (
  status: string | null | undefined,
  jobCount?: number | null
) => {
  if (status === "succeeded") {
    return {
      label: typeof jobCount === "number" ? `Extracted ${pluralJobs(jobCount)}` : "Extracted",
      tone: "success" as const
    };
  }

  return withFallback(
    status,
    {
      not_started: { label: "Not extracted yet", tone: "neutral" },
      failed: { label: "Failed", tone: "danger" },
      processing: { label: "Extracting", tone: "info" },
      running: { label: "Extracting", tone: "info" },
      processed: { label: "Processed", tone: "success" },
      duplicates: { label: "Duplicates skipped", tone: "muted" },
      skipped: { label: "Skipped", tone: "muted" }
    },
    "neutral"
  );
};

export function ExtractionStatusBadge({
  email,
  status,
  jobCount
}: {
  email?: ImportedEmail;
  status?: string | null;
  jobCount?: number | null;
}) {
  const resolvedStatus = email ? email.extractionStatus : status;
  const resolvedCount = email ? email.jobCount : jobCount;

  return <StatusBadge {...extractionStatusBadgeSpec(resolvedStatus, resolvedCount)} />;
}

export const getExtractionStatusTone = (status: string | null | undefined): BadgeTone =>
  extractionStatusBadgeSpec(status).tone;

export const fitVerdictBadgeSpec = (verdict: string | null | undefined) =>
  withFallback(
    verdict,
    {
      strong: { label: "Strong", tone: "success" },
      medium: { label: "Medium", tone: "info" },
      weak: { label: "Weak", tone: "danger" },
      unknown: { label: "Unknown", tone: "neutral" }
    },
    "neutral"
  );

export function FitVerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  return <StatusBadge {...fitVerdictBadgeSpec(verdict)} className="fit-verdict" />;
}
