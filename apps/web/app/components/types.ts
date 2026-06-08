export type User = {
  id: string;
  email: string;
};

export type Profile = {
  id: string;
  profession: string | null;
  bio: string | null;
  targetRoles: string[];
  strongSkills: string[];
  secondarySkills: string[];
  engineeringSkills: string[];
  aiSkills: string[];
  avoidSkills: string[];
  minimumSalaryEur: number | null;
  salaryMinEur: number | null;
  salaryMaxEur: number | null;
  acceptableRemoteTypes: string[];
  preferredLocations: string[];
  remotePreference: string | null;
  locationNotes: string | null;
  salaryNotes: string | null;
  germanLevel: string | null;
  englishLevel: string | null;
  languagesJson: Record<string, string> | null;
  experienceSummary: string | null;
  profileNotes: string | null;
  updatedAt: string;
  activeCv: CandidateCvMetadata | null;
};

export type CandidateCvMetadata = {
  id: string;
  sourceType: string;
  sourceName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CandidateCv = CandidateCvMetadata & {
  sourceText: string;
  parsedProfileJson: unknown;
};

export type JobDescription = {
  summaryText: string | null;
  fullText: string | null;
  rawSourceText: string | null;
  language: string | null;
};

export type FitBreakdownItem = {
  score: number;
  verdict: "strong" | "medium" | "weak" | "unknown";
  notes: string;
};

export type FitBreakdown = {
  skills: FitBreakdownItem;
  salary: FitBreakdownItem;
  locationRemote: FitBreakdownItem;
  language: FitBreakdownItem;
  seniority: FitBreakdownItem;
  sourceQuality: FitBreakdownItem;
};

export type AiReview = {
  id: string;
  score: number;
  decision: string;
  reviewText: string;
  riskFlags: string[];
  cvAngle: string;
  clarificationQuestions: string[];
  fitBreakdownJson?: FitBreakdown | null;
  createdAt: string;
};

export type Job = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  remoteType: string;
  salaryMinEur: number | null;
  salaryMaxEur: number | null;
  salaryText: string | null;
  url: string | null;
  sourceQuality: string;
  status: string;
  userDecision: string | null;
  applicationStatus: string | null;
  userNotes: string | null;
  nextAction: string | null;
  followUpDate: string | null;
  appliedAt: string | null;
  rejectedAt: string | null;
  importedEmailId: string | null;
  importedAt: string;
  updatedAt: string;
  archivedAt: string | null;
  description: JobDescription | null;
  latestAiReview: AiReview | null;
};

export type ImportedEmail = {
  id: string;
  provider: string;
  providerMessageId: string;
  providerThreadId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string;
  receivedAt: string | null;
  sourceLabel: string | null;
  snippet: string | null;
  bodyText: string | null;
  importStatus: string;
  extractionStatus: string;
  inboxStatus: string;
  processedAt: string | null;
  hiddenAt: string | null;
  triageReason: string | null;
  prefilterDecision: string | null;
  jobLikelihoodScore: number | null;
  prefilterJson: {
    jobLikelihoodScore?: number;
    prefilterDecision?: string;
    stackHits?: string[];
    blockerHits?: string[];
    positiveSignals?: string[];
    negativeSignals?: string[];
    reason?: string;
    aiExtractionEligible?: boolean;
  } | null;
  lastProcessedAt: string | null;
  jobCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GmailStatus = {
  connected: boolean;
  emailAddress: string | null;
  displayName: string | null;
  status: string;
  lastSyncAt: string | null;
};

export type GmailImportResult = {
  imported: number;
  duplicates: number;
  emails: ImportedEmail[];
  importedEmailIds?: string[];
  duplicateEmailIds?: string[];
  query: string;
};

export type ProfileFormState = {
  profession: string;
  bio: string;
  targetRoles: string;
  strongSkills: string;
  secondarySkills: string;
  engineeringSkills: string;
  aiSkills: string;
  avoidSkills: string;
  salaryMinEur: string;
  salaryMaxEur: string;
  salaryNotes: string;
  acceptableRemoteTypes: string[];
  preferredLocations: string;
  locationNotes: string;
  germanLevel: string;
  englishLevel: string;
  languages: string;
  experienceSummary: string;
  profileNotes: string;
};

export type CvFormState = {
  sourceType: string;
  sourceName: string;
  sourceText: string;
};

export type JobFormState = {
  company: string;
  title: string;
  location: string;
  remoteType: string;
  salaryText: string;
  url: string;
  fullDescription: string;
};

export type JobEnrichmentFormState = {
  url: string;
  fullDescription: string;
  language: string;
  sourceQuality: string;
};

export type ImportFormState = {
  sourceText: string;
  sourceType: string;
  sourceName: string;
};

export type ImportedEmailFormState = {
  providerMessageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  sourceLabel: string;
  bodyText: string;
};

export type GmailImportFormState = {
  query: string;
  maxResults: string;
};

export type JobAlertReviewQueueItem = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed" | "skipped" | "paused";
  company: string;
  title: string;
  errorMessage: string | null;
};

export type JobAlertExtractionQueueItem = {
  importedEmailId: string;
  status: "queued" | "running" | "completed" | "failed" | "skipped" | "paused";
  subject: string;
  from: string | null;
  prefilterDecision: string;
  jobLikelihoodScore: number;
  reason: string;
  errorMessage: string | null;
};

export type JobAlertProcessingSession = {
  id: string;
  userId: string;
  status:
    | "idle"
    | "running"
    | "completed"
    | "completed_with_errors"
    | "completed_with_paused_items"
    | "failed"
    | "cancelled";
  startedAt: string | null;
  completedAt: string | null;
  currentStep: string;
  importedCount: number;
  duplicateCount: number;
  importedBatchEmailIds: string[];
  includeBacklog: boolean;
  maxEmailsToProcess: number;
  maxExtractionsPerRun: number;
  maxReviewsPerRun: number;
  emailsConsideredCount: number;
  emailsToExtractCount: number;
  emailsSkippedPrefilterCount: number;
  emailsPausedByBudgetCount: number;
  extractedEmailsCount: number;
  failedEmailsCount: number;
  duplicateSourceCount: number;
  jobsCreatedCount: number;
  jobsReadyForReviewCount: number;
  jobsNeedingFullDescriptionCount: number;
  jobsLikelyIrrelevantCount: number;
  extractionQueue: JobAlertExtractionQueueItem[];
  reviewQueue: JobAlertReviewQueueItem[];
  extractionDelaySeconds: number;
  reviewDelaySeconds: number;
  extractionBudgetStatus: "available" | "running" | "paused_rate_limit" | "exhausted_for_run";
  reviewBudgetStatus: "available" | "running" | "paused_rate_limit" | "exhausted_for_run";
  currentExtractionEmailId: string | null;
  currentReviewJobId: string | null;
  nextExtractionAt: string | null;
  nextReviewAt: string | null;
  reviewsCompletedCount: number;
  reviewsFailedCount: number;
  errors: string[];
  warnings: string[];
  createdJobIds: string[];
};

export type JobAlertProcessingFormState = {
  gmailQuery: string;
  maxResults: string;
  maxEmailsToProcess: string;
  includeBacklog: string;
  maxExtractionsPerRun: string;
  maxReviewsPerRun: string;
  extractionDelaySeconds: string;
  reviewDelaySeconds: string;
};

export type PipelineFormState = {
  userDecision: string;
  applicationStatus: string;
  userNotes: string;
  nextAction: string;
  followUpDate: string;
};

export type ActiveView = "dashboard" | "jobs" | "imports" | "profile";

export type QueueFilter =
  | "all"
  | "needs_description"
  | "ready_for_review"
  | "apply"
  | "maybe"
  | "interested"
  | "not_interested"
  | "follow_up";

export type QuickJobDecision = "interested" | "maybe" | "not_interested";

export type JobDetailTab =
  | "overview"
  | "review"
  | "applicationPrep"
  | "description"
  | "pipeline"
  | "enrichment";

export type JobActionPlanPrimaryKind =
  | "enrich"
  | "review"
  | "decide"
  | "apply"
  | "clarify"
  | "follow_up"
  | "none";

export type JobActionPlan = {
  primaryAction: {
    label: string;
    kind: JobActionPlanPrimaryKind;
    description: string;
  };
  checklist: {
    label: string;
    status: "done" | "todo" | "warning";
  }[];
  blockers: string[];
  nextQuestions: string[];
};

export type ApplicationPrepStrengthCard = {
  key: string;
  label: string;
  summary: string;
  detail: string | null;
  chips: string[];
  tone: "success" | "info" | "warning" | "neutral";
};

export type ApplicationPrep = {
  readiness: {
    label: "Ready" | "Needs info" | "Not ready";
    tone: "success" | "warning" | "danger" | "neutral";
    reason: string;
  };
  positioning: string;
  skillChips: string[];
  strengthCards: ApplicationPrepStrengthCard[];
  skillsToEmphasize: string[];
  concernsToAddress: string[];
  questionsToClarify: string[];
  checklist: {
    label: string;
    status: "done" | "todo" | "warning";
  }[];
};

export type QueueGroup = {
  key: string;
  label: string;
  description: string;
  jobs: Job[];
};

export const queueFilterLabels: Record<QueueFilter, string> = {
  all: "All",
  needs_description: "Needs full description",
  ready_for_review: "Ready for review",
  apply: "Strong matches",
  maybe: "Maybe / clarify",
  interested: "Interested",
  not_interested: "Not interested",
  follow_up: "Pipeline follow-ups"
};

export const emptyProfileForm: ProfileFormState = {
  profession: "",
  bio: "",
  targetRoles: "",
  strongSkills: "",
  secondarySkills: "",
  engineeringSkills: "",
  aiSkills: "",
  avoidSkills: "",
  salaryMinEur: "",
  salaryMaxEur: "",
  salaryNotes: "",
  acceptableRemoteTypes: [],
  preferredLocations: "",
  locationNotes: "",
  germanLevel: "",
  englishLevel: "",
  languages: "",
  experienceSummary: "",
  profileNotes: ""
};

export const emptyCvForm: CvFormState = {
  sourceType: "typst",
  sourceName: "",
  sourceText: ""
};

export const emptyJobForm: JobFormState = {
  company: "",
  title: "",
  location: "",
  remoteType: "unknown",
  salaryText: "",
  url: "",
  fullDescription: ""
};

export const enrichmentSourceQualityOptions = [
  "unknown",
  "digest_summary",
  "email_summary",
  "partial_description",
  "full_description"
];

export const emptyImportForm: ImportFormState = {
  sourceText: "",
  sourceType: "paste",
  sourceName: ""
};

export const emptyImportedEmailForm: ImportedEmailFormState = {
  providerMessageId: "",
  fromEmail: "",
  fromName: "",
  subject: "",
  receivedAt: "",
  sourceLabel: "",
  bodyText: ""
};

export const defaultGmailImportForm: GmailImportFormState = {
  query: "label:jobAlerts newer_than:30d",
  maxResults: "10"
};

export const defaultJobAlertProcessingForm: JobAlertProcessingFormState = {
  gmailQuery: "label:jobAlerts newer_than:30d",
  maxResults: "10",
  maxEmailsToProcess: "10",
  includeBacklog: "false",
  maxExtractionsPerRun: "3",
  maxReviewsPerRun: "3",
  extractionDelaySeconds: "60",
  reviewDelaySeconds: "60"
};

export const emptyPipelineForm: PipelineFormState = {
  userDecision: "undecided",
  applicationStatus: "not_started",
  userNotes: "",
  nextAction: "",
  followUpDate: ""
};

export const remoteTypeOptions = [
  "unknown",
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite"
];

export const profileRemoteTypeOptions = [
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite",
  "unknown"
];

export const remoteTypeLabels: Record<string, string> = {
  remote: "Remote",
  remote_first: "Remote-first",
  hybrid: "Hybrid",
  homeoffice_possible: "Homeoffice possible",
  onsite: "Onsite",
  unknown: "Unknown / clarify"
};

export const userDecisionOptions = [
  "undecided",
  "interested",
  "maybe",
  "not_interested",
  "applied",
  "rejected",
  "interviewing",
  "offer",
  "archived"
];

export const applicationStatusOptions = [
  "not_started",
  "preparing",
  "applied",
  "follow_up_needed",
  "interviewing",
  "rejected",
  "offer",
  "accepted",
  "declined"
];

export const fitBreakdownRows: { key: keyof FitBreakdown; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "salary", label: "Salary" },
  { key: "locationRemote", label: "Location / Remote" },
  { key: "language", label: "Language" },
  { key: "seniority", label: "Seniority" },
  { key: "sourceQuality", label: "Source quality" }
];

export const incompleteSourceQualities = [
  "digest_summary",
  "email_summary",
  "partial_description",
  "unknown"
];

export const listToText = (items: string[]) => items.join(", ");

export const textToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const languagesToText = (value: Record<string, string> | null) =>
  value
    ? Object.entries(value)
        .map(([language, level]) => `${language}: ${level}`)
        .join("\n")
    : "";

export const textToLanguages = (value: string) => {
  const entries = value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [language, ...rest] = item.split(/:|-/);
      return [language?.trim(), rest.join("-").trim()] as const;
    })
    .filter(([language, level]) => language && level);

  return entries.length > 0
    ? Object.fromEntries(entries.map(([language, level]) => [language, level]))
    : null;
};

export const profileToForm = (profile: Profile): ProfileFormState => ({
  profession: profile.profession ?? "",
  bio: profile.bio ?? "",
  targetRoles: listToText(profile.targetRoles),
  strongSkills: listToText(profile.strongSkills),
  secondarySkills: listToText(profile.secondarySkills),
  engineeringSkills: listToText(profile.engineeringSkills),
  aiSkills: listToText(profile.aiSkills),
  avoidSkills: listToText(profile.avoidSkills),
  salaryMinEur: profile.salaryMinEur ? String(profile.salaryMinEur) : "",
  salaryMaxEur: profile.salaryMaxEur ? String(profile.salaryMaxEur) : "",
  salaryNotes: profile.salaryNotes ?? "",
  acceptableRemoteTypes: profile.acceptableRemoteTypes,
  preferredLocations: listToText(profile.preferredLocations),
  locationNotes: profile.locationNotes ?? "",
  germanLevel: profile.germanLevel ?? "",
  englishLevel: profile.englishLevel ?? "",
  languages: languagesToText(profile.languagesJson),
  experienceSummary: profile.experienceSummary ?? "",
  profileNotes: profile.profileNotes ?? ""
});

export const cvToForm = (cv: CandidateCv | null): CvFormState => ({
  sourceType: cv?.sourceType ?? "typst",
  sourceName: cv?.sourceName ?? "",
  sourceText: cv?.sourceText ?? ""
});

export const dateToInput = (value: string | null) => (value ? value.slice(0, 10) : "");

export const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "Not set";

export const previewText = (value: string, maxLength = 180) => {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}...`;
};

export const extractedJobsStatus = (email: ImportedEmail) => {
  if (email.extractionStatus === "failed") {
    return "Failed";
  }

  if (email.extractionStatus === "ignored_low_signal") {
    return "Ignored low signal";
  }

  if (email.extractionStatus === "needs_manual_check") {
    return "Needs manual check";
  }

  if (email.extractionStatus === "extraction_paused_budget") {
    return "Paused by AI budget";
  }

  if (email.extractionStatus === "duplicate_source") {
    return "Duplicate source";
  }

  if (email.extractionStatus === "not_started") {
    return "Not extracted yet";
  }

  if (email.extractionStatus === "succeeded") {
    return `Extracted ${email.jobCount} job${email.jobCount === 1 ? "" : "s"}`;
  }

  return email.extractionStatus;
};

export const selectedEmailJobCountText = (email: ImportedEmail) => {
  if (email.extractionStatus === "not_started") {
    return "Not extracted yet";
  }

  if (email.extractionStatus === "failed") {
    return "Failed";
  }

  if (email.extractionStatus === "ignored_low_signal") {
    return "Ignored low signal";
  }

  if (email.extractionStatus === "needs_manual_check") {
    return "Needs manual check";
  }

  if (email.extractionStatus === "extraction_paused_budget") {
    return "Paused by AI budget";
  }

  if (email.extractionStatus === "duplicate_source") {
    return "Duplicate source";
  }

  return String(email.jobCount);
};

export const selectedEmailEmptyJobsMessage = (email: ImportedEmail) => {
  if (email.extractionStatus === "not_started") {
    return "No jobs extracted yet.";
  }

  if (email.extractionStatus === "succeeded" && email.jobCount > 0) {
    return "Jobs were previously extracted from this email. Open Job Queue to view them.";
  }

  if (email.extractionStatus === "succeeded") {
    return "Extraction completed, but no jobs were found.";
  }

  if (email.extractionStatus === "failed") {
    return `Extraction failed${email.errorMessage ? `: ${email.errorMessage}` : "."}`;
  }

  if (email.extractionStatus === "ignored_low_signal") {
    return "Skipped by deterministic prefilter. Use Extract anyway if this should be reconsidered.";
  }

  if (email.extractionStatus === "needs_manual_check") {
    return "Needs a manual look before spending AI extraction budget.";
  }

  if (email.extractionStatus === "extraction_paused_budget") {
    return "AI extraction was paused for budget or provider-limit safety.";
  }

  if (email.extractionStatus === "duplicate_source") {
    return "Skipped because this source was already imported.";
  }

  return "No jobs extracted from this email in this session.";
};

export const jobToPipelineForm = (job: Job): PipelineFormState => ({
  userDecision: job.userDecision ?? "undecided",
  applicationStatus: job.applicationStatus ?? "not_started",
  userNotes: job.userNotes ?? "",
  nextAction: job.nextAction ?? "",
  followUpDate: dateToInput(job.followUpDate)
});

export const jobToEnrichmentForm = (job: Job | null): JobEnrichmentFormState => ({
  url: job?.url ?? "",
  fullDescription: job?.description?.fullText ?? "",
  language: job?.description?.language ?? "",
  sourceQuality:
    job && enrichmentSourceQualityOptions.includes(job.sourceQuality)
      ? job.sourceQuality
      : "unknown"
});

export const sourceNeedsFullDescription = (job: Job) =>
  job.status === "needs_full_description" || incompleteSourceQualities.includes(job.sourceQuality);

export const jobNeedsReview = (job: Job) =>
  !sourceNeedsFullDescription(job) &&
  (!job.latestAiReview || job.status === "ready_for_analysis");

export const jobIsStrongMatch = (job: Job) => {
  const review = job.latestAiReview;

  return Boolean(review && (review.decision === "apply" || review.score >= 75));
};

export const jobNeedsClarification = (job: Job) => {
  const review = job.latestAiReview;

  if (jobIsStrongMatch(job)) {
    return false;
  }

  if ((job.userDecision ?? "") === "maybe") {
    return true;
  }

  return Boolean(
    review &&
      (review.decision === "maybe" ||
        review.decision === "review_manually" ||
        review.clarificationQuestions.length > 0)
  );
};

export const jobNeedsPipelineFollowUp = (job: Job) =>
  (job.applicationStatus ?? "") === "follow_up_needed" ||
  Boolean(job.followUpDate) ||
  Boolean(job.nextAction?.trim());

export const jobIsInPipeline = (job: Job) => {
  const applicationStatus = job.applicationStatus ?? "not_started";
  const userDecision = job.userDecision ?? "undecided";

  return (
    applicationStatus !== "not_started" ||
    ["interested", "maybe", "applied", "interviewing"].includes(userDecision)
  );
};

export const getJobNextAction = (job: Job) => {
  if (sourceNeedsFullDescription(job)) {
    return "Enrich";
  }

  if (jobNeedsReview(job)) {
    return "Review";
  }

  if (jobNeedsPipelineFollowUp(job)) {
    return "Follow up";
  }

  if (jobIsStrongMatch(job)) {
    return "Decide";
  }

  if (jobNeedsClarification(job)) {
    return "Clarify";
  }

  if (jobIsInPipeline(job)) {
    return "Pipeline";
  }

  return "Triage";
};

const pipelineHasNextStep = (job: Job) =>
  (job.applicationStatus ?? "not_started") !== "not_started" || Boolean(job.nextAction?.trim());

const weakFitBreakdownNotes = (job: Job) => {
  const breakdown = job.latestAiReview?.fitBreakdownJson;

  if (!breakdown) {
    return [];
  }

  return fitBreakdownRows
    .map(({ key, label }) => {
      const item = breakdown[key];

      if (!item || (item.verdict !== "weak" && item.score >= 50)) {
        return null;
      }

      return `${label}: ${item.notes}`;
    })
    .filter((item): item is string => Boolean(item));
};

const uniqueList = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const prepKeywordSpecs = [
  { label: "TypeScript", pattern: /\btypescript\b/i },
  { label: "JavaScript", pattern: /\bjavascript\b/i },
  { label: "React", pattern: /\breact\b/i },
  { label: "Next", pattern: /\bnext(?:\.js|js)\b/i },
  { label: "Vue", pattern: /\bvue\b/i },
  { label: "Nuxt", pattern: /\bnuxt\b/i },
  { label: "Node", pattern: /\bnode(?:\.js|js)?\b/i },
  { label: "Express", pattern: /\bexpress(?:\.js|js)?\b/i },
  { label: "Python", pattern: /\bpython\b/i },
  { label: "FastAPI", pattern: /\bfastapi\b/i },
  { label: "HTML5", pattern: /\bhtml5?\b/i },
  { label: "CSS", pattern: /\bcss3?\b/i },
  { label: "REST", pattern: /\brest(?:ful)?\b/i },
  { label: "API", pattern: /\bapis?\b/i },
  { label: "Docker", pattern: /\bdocker\b/i },
  { label: "Git", pattern: /\bgit\b/i },
  { label: "AWS", pattern: /\baws\b/i },
  { label: "Firebase", pattern: /\bfirebase\b/i },
  { label: "SQL", pattern: /\bsql\b/i },
  { label: "NoSQL", pattern: /\bnosql\b/i },
  { label: "Frontend", pattern: /\bfront[- ]?end\b/i },
  { label: "Backend", pattern: /\bback[- ]?end\b/i },
  { label: "Full-stack", pattern: /\bfull[- ]?stack\b/i },
  { label: "Remote", pattern: /\b(?:full[- ]?)?remote\b/i },
  { label: "Hybrid", pattern: /\bhybrid\b/i },
  { label: "German", pattern: /\b(?:german|deutsch)\b/i },
  { label: "English", pattern: /\b(?:english|englisch)\b/i }
];

export const applicationPrepKeywordLabels = prepKeywordSpecs.map((keyword) => keyword.label);

export const extractApplicationPrepKeywords = (values: Array<string | null | undefined>) => {
  const text = values.filter(Boolean).join("\n");

  if (!text.trim()) {
    return [];
  }

  return prepKeywordSpecs
    .filter((keyword) => keyword.pattern.test(text))
    .map((keyword) => keyword.label);
};

const fitStrengthNotes = (job: Job) => {
  const breakdown = job.latestAiReview?.fitBreakdownJson;

  if (!breakdown) {
    return [];
  }

  return fitBreakdownRows
    .map(({ key, label }) => {
      const item = breakdown[key];

      if (!item || (item.verdict !== "strong" && item.score < 75)) {
        return null;
      }

      return `${label}: ${item.notes}`;
    })
    .filter((item): item is string => Boolean(item));
};

const prepStrengthLabel = (key: keyof FitBreakdown) => {
  if (key === "locationRemote") {
    return "Remote";
  }

  if (key === "sourceQuality") {
    return "Source quality";
  }

  return fitBreakdownRows.find((row) => row.key === key)?.label ?? String(key);
};

const prepStrengthSummary = (key: keyof FitBreakdown, item: FitBreakdownItem, job: Job) => {
  const notes = item.notes.toLowerCase();

  if (key === "skills") {
    if (/\bfront[- ]?end\b/.test(notes)) {
      return "Frontend technologies match";
    }

    if (/\bfull[- ]?stack\b/.test(notes)) {
      return "Full-stack experience lines up";
    }

    if (/\bback[- ]?end\b/.test(notes)) {
      return "Backend requirements match";
    }

    return "Core skill overlap looks strong";
  }

  if (key === "locationRemote") {
    if (/\bremote\b/.test(notes) || job.remoteType.includes("remote")) {
      return "Remote setup looks compatible";
    }

    if (/\bhybrid\b/.test(notes) || job.remoteType === "hybrid") {
      return "Hybrid setup looks workable";
    }

    return "Location expectations look workable";
  }

  if (key === "language") {
    const languageChips = extractApplicationPrepKeywords([item.notes]).filter((chip) =>
      ["German", "English"].includes(chip)
    );

    if (languageChips.length > 0) {
      return `${languageChips.join(" / ")} requirements look acceptable`;
    }

    return "Language requirements look acceptable";
  }

  if (key === "sourceQuality") {
    return job.sourceQuality === "full_description"
      ? "Full description available"
      : "Source is usable for prep";
  }

  if (key === "salary") {
    return "Salary range looks compatible";
  }

  if (key === "seniority") {
    return "Seniority level looks aligned";
  }

  return item.verdict === "strong" ? "Strong fit signal" : "Useful fit signal";
};

const fitStrengthCards = (job: Job): ApplicationPrepStrengthCard[] => {
  const breakdown = job.latestAiReview?.fitBreakdownJson;

  if (!breakdown) {
    return [];
  }

  return fitBreakdownRows
    .map(({ key }): ApplicationPrepStrengthCard | null => {
      const item = breakdown[key];
      const strongEnough =
        item &&
        (item.verdict === "strong" ||
          item.score >= 75 ||
          (key === "sourceQuality" && job.sourceQuality === "full_description"));

      if (!item || !strongEnough) {
        return null;
      }

      const summary = prepStrengthSummary(key, item, job);
      const detail = previewText(item.notes, 150);

      return {
        key: String(key),
        label: prepStrengthLabel(key),
        summary,
        detail: detail === summary ? null : detail,
        chips: extractApplicationPrepKeywords([item.notes, summary]),
        tone: item.verdict === "strong" ? ("success" as const) : ("info" as const)
      };
    })
    .filter((item): item is ApplicationPrepStrengthCard => item !== null);
};

const hasMajorRiskFlag = (job: Job) => {
  const review = job.latestAiReview;

  if (!review) {
    return false;
  }

  const majorRiskPattern =
    /\b(blocker|critical|major|required|must[- ]have|visa|work permit|relocat|onsite|salary|compensation|german|language|clearance)\b/i;

  return review.riskFlags.some((flag) => majorRiskPattern.test(flag));
};

const prepDecisionDone = (job: Job) =>
  ["interested", "applied", "interviewing", "offer"].includes(job.userDecision ?? "");

const addPipelinePrepChecklist = (job: Job, checklist: ApplicationPrep["checklist"]) => {
  const userDecision = job.userDecision ?? "undecided";
  const applicationStatus = job.applicationStatus ?? "not_started";

  if (userDecision === "undecided") {
    checklist.push({ label: "Mark interested/maybe/not interested", status: "todo" });
  } else if (userDecision === "interested") {
    checklist.push({ label: "Mark interested", status: "done" });
  } else if (userDecision === "maybe") {
    checklist.push({ label: "Marked maybe", status: "done" });
  } else if (userDecision === "not_interested") {
    checklist.push({ label: "Marked not interested", status: "done" });
  } else if (userDecision === "applied") {
    checklist.push({ label: "Decision saved: Applied", status: "done" });
  } else if (userDecision === "interviewing") {
    checklist.push({ label: "Decision saved: Interviewing", status: "done" });
  } else if (userDecision === "offer") {
    checklist.push({ label: "Decision saved: Offer", status: "done" });
  }

  if (applicationStatus === "not_started") {
    if (userDecision === "interested") {
      checklist.push({ label: "Set application status", status: "todo" });
    }
  } else if (applicationStatus === "preparing") {
    checklist.push({ label: "Application preparation started", status: "done" });
  } else if (applicationStatus === "applied") {
    checklist.push({ label: "Application submitted", status: "done" });
  } else if (applicationStatus === "interviewing") {
    checklist.push({ label: "Interview stage active", status: "done" });
  } else if (applicationStatus === "follow_up_needed") {
    checklist.push({ label: "Follow-up needed", status: "warning" });
  } else if (["offer", "accepted"].includes(applicationStatus)) {
    checklist.push({ label: "Application outcome is positive", status: "done" });
  } else if (["rejected", "declined"].includes(applicationStatus)) {
    checklist.push({ label: "Application closed", status: "warning" });
  }

  if (job.nextAction?.trim()) {
    checklist.push({ label: "Next action saved", status: "done" });
  }
};

export const getApplicationPrep = (job: Job): ApplicationPrep => {
  const review = job.latestAiReview;
  const needsFullDescription = sourceNeedsFullDescription(job);
  const checklist: ApplicationPrep["checklist"] = [];
  const skillsToEmphasize = uniqueList(fitStrengthNotes(job));
  const concernsToAddress = uniqueList([
    ...(needsFullDescription ? ["Incomplete source limits application confidence."] : []),
    ...(review?.riskFlags ?? []),
    ...weakFitBreakdownNotes(job)
  ]);
  const questionsToClarify = uniqueList(review?.clarificationQuestions ?? []);
  const strengthCards = fitStrengthCards(job);
  const skillChips = uniqueList(
    extractApplicationPrepKeywords([
      job.title,
      job.location,
      remoteTypeLabels[job.remoteType] ?? job.remoteType,
      job.description?.summaryText,
      job.description?.fullText,
      job.description?.rawSourceText,
      review?.reviewText,
      review?.cvAngle,
      ...(review?.riskFlags ?? []),
      ...(review?.clarificationQuestions ?? []),
      ...strengthCards.flatMap((card) => [card.summary, card.detail, ...card.chips])
    ])
  );
  const positioning =
    review?.cvAngle.trim() ||
    (review
      ? `Position the application around the strongest overlap between ${job.title} and the reviewed fit evidence.`
      : "Run AI review to produce a CV angle before writing application materials.");

  if (needsFullDescription) {
    checklist.push({ label: "Enrich job", status: "todo" });
    checklist.push({
      label: review ? "Rerun AI review after enrichment" : "Run AI review after enrichment",
      status: review ? "warning" : "todo"
    });
    addPipelinePrepChecklist(job, checklist);

    return {
      readiness: {
        label: "Not ready",
        tone: "danger",
        reason: "Add full job description before preparing application"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  checklist.push({ label: "Full job description available", status: "done" });

  if (!review) {
    checklist.push({ label: "Run AI review", status: "todo" });
    addPipelinePrepChecklist(job, checklist);

    return {
      readiness: {
        label: "Needs info",
        tone: "warning",
        reason: "Run AI review before preparing application"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  if (job.status === "ready_for_analysis") {
    checklist.push({ label: "Previous AI review available", status: "warning" });
    checklist.push({ label: "Rerun AI review", status: "todo" });
    addPipelinePrepChecklist(job, checklist);

    return {
      readiness: {
        label: "Needs info",
        tone: "warning",
        reason: "Rerun AI review before preparing application"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  checklist.push({ label: "AI review complete", status: "done" });

  const applicationStatus = job.applicationStatus ?? "not_started";
  const reviewSuggestsApply = review.decision === "apply" || review.score >= 75;
  const reviewNeedsManualDecision =
    review.decision === "maybe" || review.decision === "review_manually";
  const reviewSuggestsLowFit = review.decision === "skip" || review.score <= 45;
  const applicationInProgress = ["applied", "interviewing", "offer", "accepted"].includes(
    applicationStatus
  );

  if (reviewSuggestsApply) {
    checklist.push({
      label: "Mark interested and prepare application",
      status: prepDecisionDone(job) || applicationInProgress ? "done" : "todo"
    });
  }

  if (reviewNeedsManualDecision) {
    checklist.push({
      label:
        questionsToClarify.length > 0
          ? "Answer clarification questions"
          : "Resolve review caveats",
      status: "todo"
    });
  }

  if (reviewSuggestsLowFit) {
    checklist.push({ label: "Decide whether to archive", status: "todo" });
  }

  addPipelinePrepChecklist(job, checklist);

  if (applicationStatus === "applied") {
    return {
      readiness: {
        label: "Ready",
        tone: "success",
        reason: "Application submitted; keep tracking follow-up steps"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  if (["interviewing", "offer", "accepted"].includes(applicationStatus)) {
    return {
      readiness: {
        label: "Ready",
        tone: "success",
        reason: "Application is already moving through the pipeline"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  if (reviewSuggestsLowFit) {
    return {
      readiness: {
        label: "Not ready",
        tone: "danger",
        reason: "Review suggests low fit"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  if (reviewSuggestsApply) {
    const majorRisk = hasMajorRiskFlag(job);

    return {
      readiness: {
        label: majorRisk ? "Needs info" : "Ready",
        tone: majorRisk ? "warning" : "success",
        reason: majorRisk
          ? "Address major risk flags before preparing application"
          : "Review is strong enough to start application prep"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  if (reviewNeedsManualDecision) {
    return {
      readiness: {
        label: "Needs info",
        tone: "warning",
        reason: "Review needs clarification before application prep"
      },
      positioning,
      skillChips,
      strengthCards,
      skillsToEmphasize,
      concernsToAddress,
      questionsToClarify,
      checklist
    };
  }

  return {
    readiness: {
      label: "Needs info",
      tone: "neutral",
      reason: "Review is mixed; decide whether this role is worth preparing"
    },
    positioning,
    skillChips,
    strengthCards,
    skillsToEmphasize,
    concernsToAddress,
    questionsToClarify,
    checklist
  };
};

export const getJobActionPlan = (job: Job): JobActionPlan => {
  const review = job.latestAiReview;
  const needsFullDescription = sourceNeedsFullDescription(job);
  const strongReview = Boolean(review && (review.decision === "apply" || review.score >= 75));
  const manualReview = Boolean(
    review && (review.decision === "maybe" || review.decision === "review_manually")
  );
  const decision = job.userDecision ?? "undecided";
  const blockers = [
    ...(!needsFullDescription ? [] : ["Review may be unreliable until the job has a full description."]),
    ...(review?.riskFlags.slice(0, 3) ?? []),
    ...weakFitBreakdownNotes(job).slice(0, 2)
  ];
  const nextQuestions = review?.clarificationQuestions.slice(0, 3) ?? [];
  const checklist: JobActionPlan["checklist"] = [];

  if (decision === "not_interested") {
    return {
      primaryAction: {
        label: "Decision made",
        kind: "none",
        description: "This job is marked not interested. Keep it for reference or archive it."
      },
      checklist: [
        { label: "Decision made: Not interested", status: "done" },
        { label: "Archive when you no longer need it visible", status: "todo" }
      ],
      blockers: [],
      nextQuestions: []
    };
  }

  if (needsFullDescription) {
    checklist.push(
      { label: "Add full job description", status: "todo" },
      {
        label: review ? "Rerun review after enrichment" : "Run review after enrichment",
        status: "warning"
      }
    );

    if (decision === "interested" || decision === "maybe") {
      checklist.push({
        label: "Keep pipeline decision, but verify it after enrichment",
        status: "warning"
      });
    }

    return {
      primaryAction: {
        label: "Enrich job",
        kind: "enrich",
        description: "Add the full job description before relying on fit analysis."
      },
      checklist,
      blockers,
      nextQuestions
    };
  }

  checklist.push({ label: "Source is good enough for review", status: "done" });

  if (decision === "interested" || decision === "maybe") {
    checklist.push(
      review
        ? { label: "AI review complete", status: "done" }
        : { label: "Run AI review for confidence", status: "todo" },
      { label: `Decision made: ${decision === "interested" ? "Interested" : "Maybe"}`, status: "done" },
      {
        label: pipelineHasNextStep(job) ? "Pipeline next step saved" : "Set application status or next action",
        status: pipelineHasNextStep(job) ? "done" : "todo"
      }
    );

    return {
      primaryAction: {
        label: "Follow up",
        kind: "follow_up",
        description: "Set the next pipeline step so this decision does not stall."
      },
      checklist,
      blockers: review ? blockers : [],
      nextQuestions: review ? nextQuestions : []
    };
  }

  if (!review) {
    checklist.push({ label: "Run AI review", status: "todo" });

    return {
      primaryAction: {
        label: "Run AI review",
        kind: "review",
        description: "Score this role against your profile and surface risks or questions."
      },
      checklist,
      blockers: [],
      nextQuestions: []
    };
  }

  checklist.push({ label: "AI review complete", status: "done" });

  if (strongReview) {
    checklist.push({ label: "Mark interested or start application planning", status: "todo" });

    if (review.riskFlags.length > 0) {
      checklist.push({ label: "Review risk flags before applying", status: "warning" });
    }

    return {
      primaryAction: {
        label: "Decide / apply",
        kind: "apply",
        description: "The review is strong. Decide whether to mark interested and start the application path."
      },
      checklist,
      blockers,
      nextQuestions
    };
  }

  if (manualReview || nextQuestions.length > 0) {
    checklist.push(
      {
        label: nextQuestions.length > 0 ? "Answer clarification questions" : "Resolve manual review caveats",
        status: "todo"
      },
      { label: "Save a decision in Pipeline", status: "todo" }
    );

    return {
      primaryAction: {
        label: "Clarify",
        kind: "clarify",
        description: "Resolve the open questions or caveats before deciding."
      },
      checklist,
      blockers,
      nextQuestions
    };
  }

  checklist.push({ label: "Save a decision or archive", status: "todo" });

  return {
    primaryAction: {
      label: "Decide next step",
      kind: "decide",
      description: "Review the evidence, then move this job into pipeline or out of the queue."
    },
    checklist,
    blockers,
    nextQuestions
  };
};

export const defaultJobDetailTab = (job: Job): JobDetailTab => {
  void job;
  return "overview";
};

export const formatSalary = (job: Job) => {
  if (job.salaryText) {
    return job.salaryText;
  }

  if (job.salaryMinEur && job.salaryMaxEur) {
    return `${job.salaryMinEur.toLocaleString()}-${job.salaryMaxEur.toLocaleString()} EUR`;
  }

  if (job.salaryMinEur) {
    return `From ${job.salaryMinEur.toLocaleString()} EUR`;
  }

  if (job.salaryMaxEur) {
    return `Up to ${job.salaryMaxEur.toLocaleString()} EUR`;
  }

  return "Not listed";
};

export const formatRemoteType = (remoteType: string) => remoteTypeLabels[remoteType] ?? remoteType;

export const formatLocationRemote = (job: Job) =>
  [job.location ?? "Unknown location", formatRemoteType(job.remoteType)].filter(Boolean).join(" / ");

export const groupJobsByQueueState = (jobs: Job[]): QueueGroup[] => {
  const groups: QueueGroup[] = [
    {
      key: "needs_description",
      label: "Needs full description",
      description: "Paste the full posting before trusting a review.",
      jobs: []
    },
    {
      key: "ready_for_review",
      label: "Ready for AI review",
      description: "Full enough to score against the profile.",
      jobs: []
    },
    {
      key: "apply",
      label: "Reviewed: Apply / strong matches",
      description: "High scoring or marked apply by the latest review.",
      jobs: []
    },
    {
      key: "maybe",
      label: "Reviewed: Maybe / clarify",
      description: "Worth a second look or needs clarification.",
      jobs: []
    },
    {
      key: "pipeline",
      label: "In pipeline",
      description: "Jobs with user interest or application progress.",
      jobs: []
    },
    {
      key: "other",
      label: "Other active jobs",
      description: "Active jobs that do not need immediate queue action.",
      jobs: []
    }
  ];

  const byKey = new Map(groups.map((group) => [group.key, group]));

  jobs.forEach((job) => {
    if (sourceNeedsFullDescription(job)) {
      byKey.get("needs_description")?.jobs.push(job);
      return;
    }

    if (jobNeedsReview(job)) {
      byKey.get("ready_for_review")?.jobs.push(job);
      return;
    }

    if (jobIsStrongMatch(job)) {
      byKey.get("apply")?.jobs.push(job);
      return;
    }

    if (jobNeedsClarification(job)) {
      byKey.get("maybe")?.jobs.push(job);
      return;
    }

    if (jobIsInPipeline(job)) {
      byKey.get("pipeline")?.jobs.push(job);
      return;
    }

    byKey.get("other")?.jobs.push(job);
  });

  return groups.filter((group) => group.jobs.length > 0);
};
