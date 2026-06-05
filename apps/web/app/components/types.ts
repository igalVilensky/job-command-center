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
  | "follow_up";

export type JobDetailTab = "overview" | "review" | "description" | "pipeline" | "enrichment";

export type QueueGroup = {
  key: string;
  label: string;
  description: string;
  jobs: Job[];
};

export const queueFilterLabels: Record<QueueFilter, string> = {
  all: "All active jobs",
  needs_description: "Needs full description",
  ready_for_review: "Ready for review",
  apply: "Strong matches / Apply",
  maybe: "Maybe / clarify",
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

  return Boolean(
    review &&
      (review.decision === "maybe" ||
        review.decision === "review_manually" ||
        review.clarificationQuestions.length > 0 ||
        (job.userDecision ?? "") === "maybe")
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

export const defaultJobDetailTab = (job: Job): JobDetailTab => {
  if (job.latestAiReview) {
    return "review";
  }

  if (sourceNeedsFullDescription(job)) {
    return "enrichment";
  }

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
