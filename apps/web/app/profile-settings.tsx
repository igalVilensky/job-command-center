"use client";

import { type FormEvent, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
};

type Profile = {
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

type CandidateCvMetadata = {
  id: string;
  sourceType: string;
  sourceName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CandidateCv = CandidateCvMetadata & {
  sourceText: string;
  parsedProfileJson: unknown;
};

type JobDescription = {
  summaryText: string | null;
  fullText: string | null;
  rawSourceText: string | null;
  language: string | null;
};

type FitBreakdownItem = {
  score: number;
  verdict: "strong" | "medium" | "weak" | "unknown";
  notes: string;
};

type FitBreakdown = {
  skills: FitBreakdownItem;
  salary: FitBreakdownItem;
  locationRemote: FitBreakdownItem;
  language: FitBreakdownItem;
  seniority: FitBreakdownItem;
  sourceQuality: FitBreakdownItem;
};

type AiReview = {
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

type Job = {
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

type ImportedEmail = {
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

type GmailStatus = {
  connected: boolean;
  emailAddress: string | null;
  displayName: string | null;
  status: string;
  lastSyncAt: string | null;
};

type GmailImportResult = {
  imported: number;
  duplicates: number;
  emails: ImportedEmail[];
  query: string;
};

type ProfileFormState = {
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

type CvFormState = {
  sourceType: string;
  sourceName: string;
  sourceText: string;
};

type JobFormState = {
  company: string;
  title: string;
  location: string;
  remoteType: string;
  salaryText: string;
  url: string;
  fullDescription: string;
};

type JobEnrichmentFormState = {
  url: string;
  fullDescription: string;
  language: string;
  sourceQuality: string;
};

type ImportFormState = {
  sourceText: string;
  sourceType: string;
  sourceName: string;
};

type ImportedEmailFormState = {
  providerMessageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  sourceLabel: string;
  bodyText: string;
};

type GmailImportFormState = {
  query: string;
  maxResults: string;
};

type PipelineFormState = {
  userDecision: string;
  applicationStatus: string;
  userNotes: string;
  nextAction: string;
  followUpDate: string;
};

type ActiveView = "profile" | "import" | "imports" | "jobs";

const emptyProfileForm: ProfileFormState = {
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

const emptyCvForm: CvFormState = {
  sourceType: "typst",
  sourceName: "",
  sourceText: ""
};

const emptyJobForm: JobFormState = {
  company: "",
  title: "",
  location: "",
  remoteType: "unknown",
  salaryText: "",
  url: "",
  fullDescription: ""
};

const enrichmentSourceQualityOptions = [
  "unknown",
  "digest_summary",
  "email_summary",
  "partial_description",
  "full_description"
];

const emptyImportForm: ImportFormState = {
  sourceText: "",
  sourceType: "paste",
  sourceName: ""
};

const emptyImportedEmailForm: ImportedEmailFormState = {
  providerMessageId: "",
  fromEmail: "",
  fromName: "",
  subject: "",
  receivedAt: "",
  sourceLabel: "",
  bodyText: ""
};

const defaultGmailImportForm: GmailImportFormState = {
  query: "label:jobAlerts newer_than:30d",
  maxResults: "10"
};

const emptyPipelineForm: PipelineFormState = {
  userDecision: "undecided",
  applicationStatus: "not_started",
  userNotes: "",
  nextAction: "",
  followUpDate: ""
};

const remoteTypeOptions = [
  "unknown",
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite"
];

const profileRemoteTypeOptions = [
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite",
  "unknown"
];

const remoteTypeLabels: Record<string, string> = {
  remote: "Remote",
  remote_first: "Remote-first",
  hybrid: "Hybrid",
  homeoffice_possible: "Homeoffice possible",
  onsite: "Onsite",
  unknown: "Unknown / clarify"
};

const userDecisionOptions = [
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

const applicationStatusOptions = [
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

const fitBreakdownRows: { key: keyof FitBreakdown; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "salary", label: "Salary" },
  { key: "locationRemote", label: "Location / Remote" },
  { key: "language", label: "Language" },
  { key: "seniority", label: "Seniority" },
  { key: "sourceQuality", label: "Source quality" }
];

const listToText = (items: string[]) => items.join(", ");

const textToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const languagesToText = (value: Record<string, string> | null) =>
  value
    ? Object.entries(value)
        .map(([language, level]) => `${language}: ${level}`)
        .join("\n")
    : "";

const textToLanguages = (value: string) => {
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

const profileToForm = (profile: Profile): ProfileFormState => ({
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

const cvToForm = (cv: CandidateCv | null): CvFormState => ({
  sourceType: cv?.sourceType ?? "typst",
  sourceName: cv?.sourceName ?? "",
  sourceText: cv?.sourceText ?? ""
});

const dateToInput = (value: string | null) => (value ? value.slice(0, 10) : "");

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "Not set";

const previewText = (value: string, maxLength = 180) => {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}...`;
};

const extractedJobsStatus = (email: ImportedEmail) => {
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

const selectedEmailJobCountText = (email: ImportedEmail) => {
  if (email.extractionStatus === "not_started") {
    return "Not extracted yet";
  }

  if (email.extractionStatus === "failed") {
    return "Failed";
  }

  return String(email.jobCount);
};

const selectedEmailEmptyJobsMessage = (email: ImportedEmail) => {
  if (email.extractionStatus === "not_started") {
    return "No jobs extracted yet.";
  }

  if (email.extractionStatus === "succeeded" && email.jobCount > 0) {
    return "Jobs were previously extracted from this email. Open Job Inbox to view them.";
  }

  if (email.extractionStatus === "succeeded") {
    return "Extraction completed, but no jobs were found.";
  }

  if (email.extractionStatus === "failed") {
    return `Extraction failed${email.errorMessage ? `: ${email.errorMessage}` : "."}`;
  }

  return "No jobs extracted from this email in this session.";
};

const jobToPipelineForm = (job: Job): PipelineFormState => ({
  userDecision: job.userDecision ?? "undecided",
  applicationStatus: job.applicationStatus ?? "not_started",
  userNotes: job.userNotes ?? "",
  nextAction: job.nextAction ?? "",
  followUpDate: dateToInput(job.followUpDate)
});

const jobToEnrichmentForm = (job: Job | null): JobEnrichmentFormState => ({
  url: job?.url ?? "",
  fullDescription: job?.description?.fullText ?? "",
  language: job?.description?.language ?? "",
  sourceQuality:
    job && enrichmentSourceQualityOptions.includes(job.sourceQuality)
      ? job.sourceQuality
      : "unknown"
});

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: unknown; detail?: unknown } }).error
        : undefined;
    const message = typeof errorBody?.message === "string" ? errorBody.message : undefined;
    const detail = typeof errorBody?.detail === "string" ? errorBody.detail : undefined;

    throw new Error(detail ?? message ?? `Request failed with ${response.status}`);
  }

  return body as T;
};

export function ProfileSettings({ apiUrl }: { apiUrl: string }) {
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [loginForm, setLoginForm] = useState({
    email: "demo@jobcc.local",
    password: "password123"
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [cvForm, setCvForm] = useState<CvFormState>(emptyCvForm);
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJobForm);
  const [enrichmentForm, setEnrichmentForm] =
    useState<JobEnrichmentFormState>(jobToEnrichmentForm(null));
  const [importForm, setImportForm] = useState<ImportFormState>(emptyImportForm);
  const [importedEmailForm, setImportedEmailForm] =
    useState<ImportedEmailFormState>(emptyImportedEmailForm);
  const [gmailImportForm, setGmailImportForm] =
    useState<GmailImportFormState>(defaultGmailImportForm);
  const [pipelineForm, setPipelineForm] = useState<PipelineFormState>(emptyPipelineForm);
  const [extractedJobs, setExtractedJobs] = useState<Job[]>([]);
  const [importedEmailExtractedJobs, setImportedEmailExtractedJobs] = useState<Job[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importedEmailWarnings, setImportedEmailWarnings] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeCv, setActiveCv] = useState<CandidateCv | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [importedEmails, setImportedEmails] = useState<ImportedEmail[]>([]);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailImportResult, setGmailImportResult] = useState<GmailImportResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedImportedEmail, setSelectedImportedEmail] = useState<ImportedEmail | null>(null);
  const [userDecisionFilter, setUserDecisionFilter] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const request = async <T,>(path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      headers
    });

    return parseResponse<T>(response);
  };

  const loadProfile = async () => {
    const data = await request<{ profile: Profile }>("/profile");
    setProfile(data.profile);
    setProfileForm(profileToForm(data.profile));
  };

  const loadCandidateCv = async () => {
    const data = await request<{ cv: CandidateCv | null }>("/profile/cv");
    setActiveCv(data.cv);
    setCvForm(cvToForm(data.cv));
    return data.cv;
  };

  const loadJobs = async () => {
    const data = await request<{ jobs: Job[] }>("/jobs");
    setJobs(data.jobs);
    return data.jobs;
  };

  const loadImportedEmails = async () => {
    const data = await request<{ emails: ImportedEmail[] }>("/imports/emails");
    setImportedEmails(data.emails);
    return data.emails;
  };

  const loadGmailStatus = async () => {
    const data = await request<GmailStatus>("/gmail/status");
    setGmailStatus(data);
    return data;
  };

  const loadJob = async (id: string) => {
    const data = await request<{ job: Job }>(`/jobs/${id}`);
    setSelectedJob(data.job);
  };

  const selectImportedEmail = (email: ImportedEmail) => {
    setSelectedImportedEmail(email);
    setImportedEmailExtractedJobs([]);
    setImportedEmailWarnings([]);
    setSelectedJob(null);
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await request<{ user: User }>("/auth/me");
        setUser(data.user);
        await Promise.all([
          loadProfile(),
          loadCandidateCv(),
          loadJobs(),
          loadImportedEmails(),
          loadGmailStatus()
        ]);
      } catch {
        setUser(null);
      }
    };

    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");

    if (!gmail) {
      return;
    }

    setActiveView("imports");

    if (gmail === "connected") {
      setStatus("Gmail connected");
      void loadGmailStatus();
    } else {
      setError("Gmail connection failed");
    }

    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPipelineForm(selectedJob ? jobToPipelineForm(selectedJob) : emptyPipelineForm);
    setEnrichmentForm(jobToEnrichmentForm(selectedJob));
  }, [selectedJob]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });

      setUser(data.user);
      await Promise.all([
        loadProfile(),
        loadCandidateCv(),
        loadJobs(),
        loadImportedEmails(),
        loadGmailStatus()
      ]);
      setStatus("Signed in");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");

    const salaryMinText = profileForm.salaryMinEur.trim();
    const salaryMaxText = profileForm.salaryMaxEur.trim();
    const salaryMin = salaryMinText ? Number(salaryMinText) : null;
    const salaryMax = salaryMaxText ? Number(salaryMaxText) : null;

    if (salaryMin !== null && (!Number.isInteger(salaryMin) || salaryMin <= 0)) {
      setError("Desired salary min must be a positive integer");
      setIsBusy(false);
      return;
    }

    if (salaryMax !== null && (!Number.isInteger(salaryMax) || salaryMax <= 0)) {
      setError("Desired salary max must be a positive integer");
      setIsBusy(false);
      return;
    }

    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      setError("Desired salary min must be less than or equal to desired salary max");
      setIsBusy(false);
      return;
    }

    try {
      const data = await request<{ profile: Profile }>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          profession: profileForm.profession.trim() || null,
          bio: profileForm.bio.trim() || null,
          targetRoles: textToList(profileForm.targetRoles),
          strongSkills: textToList(profileForm.strongSkills),
          secondarySkills: textToList(profileForm.secondarySkills),
          engineeringSkills: textToList(profileForm.engineeringSkills),
          aiSkills: textToList(profileForm.aiSkills),
          avoidSkills: textToList(profileForm.avoidSkills),
          minimumSalaryEur: null,
          salaryMinEur: salaryMin,
          salaryMaxEur: salaryMax,
          salaryNotes: profileForm.salaryNotes.trim() || null,
          acceptableRemoteTypes: profileForm.acceptableRemoteTypes,
          preferredLocations: textToList(profileForm.preferredLocations),
          remotePreference: null,
          locationNotes: profileForm.locationNotes.trim() || null,
          germanLevel: profileForm.germanLevel.trim() || null,
          englishLevel: profileForm.englishLevel.trim() || null,
          languagesJson: textToLanguages(profileForm.languages),
          experienceSummary: profileForm.experienceSummary.trim() || null,
          profileNotes: profileForm.profileNotes.trim() || null
        })
      });

      setProfile(data.profile);
      setProfileForm(profileToForm(data.profile));
      setStatus("Profile saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCvSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ profile: Profile; cv: CandidateCv }>("/profile/cv", {
        method: "POST",
        body: JSON.stringify({
          sourceType: cvForm.sourceType || "typst",
          sourceName: cvForm.sourceName || null,
          sourceText: cvForm.sourceText
        })
      });

      setProfile(data.profile);
      setProfileForm(profileToForm(data.profile));
      setActiveCv(data.cv);
      setCvForm(cvToForm(data.cv));
      setStatus("CV saved and profile updated");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "CV save failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleJobCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ job: Job }>("/jobs", {
        method: "POST",
        body: JSON.stringify({
          company: jobForm.company,
          title: jobForm.title,
          location: jobForm.location || null,
          remoteType: jobForm.remoteType,
          salaryText: jobForm.salaryText || null,
          url: jobForm.url || null,
          fullDescription: jobForm.fullDescription || null
        })
      });

      setJobForm(emptyJobForm);
      setSelectedJob(data.job);
      await loadJobs();
      setStatus("Job created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Job creation failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExtractJobs = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");
    setImportWarnings([]);

    try {
      const data = await request<{ jobs: Job[]; warnings: string[] }>("/ai/extract-jobs", {
        method: "POST",
        body: JSON.stringify({
          sourceText: importForm.sourceText,
          sourceType: importForm.sourceType || "paste",
          sourceName: importForm.sourceName || null
        })
      });

      setExtractedJobs(data.jobs);
      setImportWarnings(data.warnings);
      if (data.jobs[0]) {
        setSelectedJob(data.jobs[0]);
      }
      await loadJobs();
      setStatus(`Extracted ${data.jobs.length} job${data.jobs.length === 1 ? "" : "s"}`);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Extraction failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimulateImportedEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");
    setImportedEmailExtractedJobs([]);
    setImportedEmailWarnings([]);

    try {
      const bodyText = importedEmailForm.bodyText.trim();
      const data = await request<{ email: ImportedEmail; duplicate: boolean }>(
        "/imports/emails/simulate",
        {
          method: "POST",
          body: JSON.stringify({
            providerMessageId: importedEmailForm.providerMessageId,
            fromEmail: importedEmailForm.fromEmail || null,
            fromName: importedEmailForm.fromName || null,
            subject: importedEmailForm.subject,
            receivedAt: importedEmailForm.receivedAt
              ? new Date(importedEmailForm.receivedAt).toISOString()
              : null,
            sourceLabel: importedEmailForm.sourceLabel || null,
            snippet: previewText(bodyText),
            bodyText
          })
        }
      );

      selectImportedEmail(data.email);
      if (!data.duplicate) {
        setImportedEmailForm(emptyImportedEmailForm);
      }
      await loadImportedEmails();
      setStatus(data.duplicate ? "Imported email already exists" : "Imported email saved");
    } catch (simulateError) {
      setError(simulateError instanceof Error ? simulateError.message : "Email import failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartGmailOAuth = async () => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ authUrl: string }>("/gmail/oauth/start");
      window.location.href = data.authUrl;
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Gmail connection failed");
      setIsBusy(false);
    }
  };

  const handleDisconnectGmail = async () => {
    setIsBusy(true);
    setError("");
    setStatus("");
    setGmailImportResult(null);

    try {
      await request<{ ok: boolean }>("/gmail/disconnect", {
        method: "POST"
      });
      await loadGmailStatus();
      setStatus("Gmail disconnected");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Gmail disconnect failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportFromGmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");
    setGmailImportResult(null);
    setImportedEmailExtractedJobs([]);
    setImportedEmailWarnings([]);

    const maxResults = Number(gmailImportForm.maxResults);

    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 25) {
      setError("Max results must be an integer between 1 and 25");
      setIsBusy(false);
      return;
    }

    try {
      const data = await request<GmailImportResult>("/gmail/import/recent", {
        method: "POST",
        body: JSON.stringify({
          query: gmailImportForm.query || null,
          maxResults
        })
      });

      setGmailImportResult(data);
      if (data.emails[0]) {
        selectImportedEmail(data.emails[0]);
      }
      await Promise.all([loadImportedEmails(), loadGmailStatus()]);
      setStatus(`Gmail import complete: ${data.imported} new, ${data.duplicates} duplicate`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Gmail import failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExtractImportedEmail = async (id: string) => {
    setIsBusy(true);
    setError("");
    setStatus("");
    setImportedEmailWarnings([]);

    try {
      const data = await request<{
        jobs: Job[];
        email: ImportedEmail;
        warnings: string[];
        createdCount: number;
        skippedDuplicates: number;
      }>(
        `/imports/emails/${id}/extract`,
        {
          method: "POST"
        }
      );

      setImportedEmailExtractedJobs(data.jobs);
      setImportedEmailWarnings(data.warnings);
      setSelectedImportedEmail(data.email);
      if (data.jobs[0]) {
        setSelectedJob(data.jobs[0]);
      }
      await Promise.all([loadImportedEmails(), loadJobs()]);
      setStatus(
        `Extracted ${data.createdCount} job${data.createdCount === 1 ? "" : "s"} from email` +
          (data.skippedDuplicates
            ? `, skipped ${data.skippedDuplicates} duplicate${data.skippedDuplicates === 1 ? "" : "s"}`
            : "")
      );
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Email extraction failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReviewJob = async (id: string) => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ job: Job; review: AiReview }>(`/jobs/${id}/review`, {
        method: "POST"
      });

      setSelectedJob(data.job);
      await loadJobs();
      setStatus(`Review complete: ${data.review.decision}`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review failed");
    } finally {
      setIsBusy(false);
    }
  };

  const saveJobEnrichment = async (runReview: boolean) => {
    if (!selectedJob) {
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    const fullDescription = enrichmentForm.fullDescription.trim();
    let savedJob: Job | null = null;

    try {
      const data = await request<{ job: Job }>(`/jobs/${selectedJob.id}/enrich`, {
        method: "PATCH",
        body: JSON.stringify({
          url: enrichmentForm.url.trim() || null,
          ...(fullDescription ? { fullDescription } : {}),
          language: enrichmentForm.language.trim() || null,
          sourceQuality: fullDescription ? "full_description" : enrichmentForm.sourceQuality
        })
      });

      savedJob = data.job;
      setSelectedJob(data.job);
      setEnrichmentForm(jobToEnrichmentForm(data.job));
      await loadJobs();

      if (runReview) {
        const reviewData = await request<{ job: Job; review: AiReview }>(
          `/jobs/${data.job.id}/review`,
          {
            method: "POST"
          }
        );

        setSelectedJob(reviewData.job);
        setEnrichmentForm(jobToEnrichmentForm(reviewData.job));
        await loadJobs();
        setStatus(`Enrichment saved. Review complete: ${reviewData.review.decision}`);
        return;
      }

      setStatus("Job details enriched");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : savedJob && runReview
            ? "Review failed after enrichment"
            : "Enrichment save failed"
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnrichmentSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveJobEnrichment(false);
  };

  const handleArchiveJob = async (id: string) => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      await request<{ job: Job }>(`/jobs/${id}/archive`, {
        method: "POST"
      });

      setSelectedJob(null);
      await loadJobs();
      setStatus("Job archived");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archive failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePipelineSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedJob) {
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ job: Job }>(`/jobs/${selectedJob.id}/pipeline`, {
        method: "PATCH",
        body: JSON.stringify({
          userDecision: pipelineForm.userDecision || null,
          applicationStatus: pipelineForm.applicationStatus || null,
          userNotes: pipelineForm.userNotes.trim() || null,
          nextAction: pipelineForm.nextAction.trim() || null,
          followUpDate: pipelineForm.followUpDate
            ? `${pipelineForm.followUpDate}T00:00:00.000Z`
            : null
        })
      });

      setSelectedJob(data.job);
      await loadJobs();
      setStatus("Pipeline saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pipeline save failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      await request<{ ok: boolean }>("/auth/logout", {
        method: "POST"
      });

      setUser(null);
      setProfile(null);
      setActiveCv(null);
      setJobs([]);
      setImportedEmails([]);
      setGmailStatus(null);
      setGmailImportResult(null);
      setSelectedJob(null);
      setSelectedImportedEmail(null);
      setExtractedJobs([]);
      setImportedEmailExtractedJobs([]);
      setImportWarnings([]);
      setImportedEmailWarnings([]);
      setProfileForm(emptyProfileForm);
      setCvForm(emptyCvForm);
      setJobForm(emptyJobForm);
      setEnrichmentForm(jobToEnrichmentForm(null));
      setImportForm(emptyImportForm);
      setImportedEmailForm(emptyImportedEmailForm);
      setGmailImportForm(defaultGmailImportForm);
      setPipelineForm(emptyPipelineForm);
      setUserDecisionFilter("");
      setApplicationStatusFilter("");
      setStatus("Signed out");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Logout failed");
    } finally {
      setIsBusy(false);
    }
  };

  const updateProfileField = (
    field: Exclude<keyof ProfileFormState, "acceptableRemoteTypes">,
    value: string
  ) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const toggleAcceptableRemoteType = (remoteType: string) => {
    setProfileForm((current) => ({
      ...current,
      acceptableRemoteTypes: current.acceptableRemoteTypes.includes(remoteType)
        ? current.acceptableRemoteTypes.filter((item) => item !== remoteType)
        : [...current.acceptableRemoteTypes, remoteType]
    }));
  };

  const updateCvField = (field: keyof CvFormState, value: string) => {
    setCvForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateJobField = (field: keyof JobFormState, value: string) => {
    setJobForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateEnrichmentField = (field: keyof JobEnrichmentFormState, value: string) => {
    setEnrichmentForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateImportField = (field: keyof ImportFormState, value: string) => {
    setImportForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateImportedEmailField = (field: keyof ImportedEmailFormState, value: string) => {
    setImportedEmailForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateGmailImportField = (field: keyof GmailImportFormState, value: string) => {
    setGmailImportForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updatePipelineField = (field: keyof PipelineFormState, value: string) => {
    setPipelineForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesDecision =
      !userDecisionFilter || (job.userDecision ?? "undecided") === userDecisionFilter;
    const matchesApplicationStatus =
      !applicationStatusFilter ||
      (job.applicationStatus ?? "not_started") === applicationStatusFilter;

    return matchesDecision && matchesApplicationStatus;
  });

  return (
    <main className="page-shell" data-api-url={apiUrl}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Milestone 10</p>
          <h1>Job Command Center</h1>
        </div>
        <p className="api-pill">API: {apiUrl}</p>
      </header>

      <nav className="tab-row" aria-label="Primary">
        <button
          className={activeView === "profile" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("profile")}
        >
          Candidate Profile
        </button>
        <button
          className={activeView === "import" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("import")}
        >
          Import/Paste
        </button>
        <button
          className={activeView === "imports" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("imports")}
        >
          Imports
        </button>
        <button
          className={activeView === "jobs" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("jobs")}
        >
          Job Inbox
        </button>
      </nav>

      <section className="workspace" aria-live="polite">
        <form className="login-panel" onSubmit={handleLogin}>
          <div>
            <h2>Demo Login</h2>
            <p className="muted">Use the seeded local account.</p>
          </div>

          <label>
            Email
            <input
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              autoComplete="current-password"
            />
          </label>

          <div className="button-row">
            <button disabled={isBusy} type="submit">
              Sign in
            </button>
            <button disabled={isBusy || !user} type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>

          {user ? <p className="muted">Signed in as {user.email}</p> : null}
        </form>

        {activeView === "profile" ? (
          <section className="profile-panel">
            <div className="section-heading">
              <h2>Candidate Profile</h2>
              {profile ? (
                <p className="muted">Updated {new Date(profile.updatedAt).toLocaleString()}</p>
              ) : null}
            </div>

            <form className="job-form" onSubmit={handleCvSave}>
              <div className="section-heading">
                <h3>CV Source</h3>
                {activeCv ? (
                  <p className="muted">
                    {activeCv.sourceName || "Active CV"} updated{" "}
                    {new Date(activeCv.updatedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <p className="muted">
                Save CV and update profile from CV refreshes parsed CV-backed fields like
                profession, bio, roles, skills, languages, and experience.
                Job-search preferences such as salary range, remote modes, locations, and avoid
                skills stay manual.
              </p>
              <div className="form-grid">
                <label>
                  Source type
                  <input
                    value={cvForm.sourceType}
                    onChange={(event) => updateCvField("sourceType", event.target.value)}
                  />
                </label>
                <label>
                  Source name
                  <input
                    value={cvForm.sourceName}
                    onChange={(event) => updateCvField("sourceName", event.target.value)}
                  />
                </label>
                <label className="wide">
                  Typst CV source
                  <textarea
                    value={cvForm.sourceText}
                    onChange={(event) => updateCvField("sourceText", event.target.value)}
                    rows={10}
                  />
                </label>
              </div>
              <div className="button-row">
                <button disabled={isBusy || !user || !cvForm.sourceText.trim()} type="submit">
                  Save CV and update profile from CV
                </button>
                <button
                  disabled={isBusy || !user}
                  type="button"
                  onClick={() => void loadCandidateCv()}
                >
                  Refresh CV
                </button>
              </div>
            </form>

            <form className="job-form" onSubmit={handleProfileSave}>
              <div className="section-heading">
                <h3>Candidate Summary</h3>
              </div>
              <p className="muted">
                The CV source describes your background. Preferences below are used as filters for
                scoring jobs.
              </p>
              <div className="form-grid">
                <label>
                  Profession
                  <input
                    value={profileForm.profession}
                    onChange={(event) => updateProfileField("profession", event.target.value)}
                  />
                </label>
                <label>
                  Desired salary min EUR
                  <input
                    value={profileForm.salaryMinEur}
                    onChange={(event) => updateProfileField("salaryMinEur", event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Desired salary max EUR
                  <input
                    value={profileForm.salaryMaxEur}
                    onChange={(event) => updateProfileField("salaryMaxEur", event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="wide">
                  Salary notes
                  <textarea
                    value={profileForm.salaryNotes}
                    onChange={(event) => updateProfileField("salaryNotes", event.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  Preferred locations
                  <textarea
                    value={profileForm.preferredLocations}
                    onChange={(event) =>
                      updateProfileField("preferredLocations", event.target.value)
                    }
                  />
                </label>
                <label className="wide">
                  Location notes
                  <textarea
                    value={profileForm.locationNotes}
                    onChange={(event) => updateProfileField("locationNotes", event.target.value)}
                    rows={3}
                  />
                </label>
                <div className="wide checkbox-group">
                  <p>Acceptable remote types</p>
                  <div>
                    {profileRemoteTypeOptions.map((option) => (
                      <label key={option}>
                        <input
                          checked={profileForm.acceptableRemoteTypes.includes(option)}
                          onChange={() => toggleAcceptableRemoteType(option)}
                          type="checkbox"
                        />
                        {remoteTypeLabels[option]}
                      </label>
                    ))}
                  </div>
                </div>
                <label>
                  German level
                  <input
                    value={profileForm.germanLevel}
                    onChange={(event) => updateProfileField("germanLevel", event.target.value)}
                  />
                </label>
                <label>
                  English level
                  <input
                    value={profileForm.englishLevel}
                    onChange={(event) => updateProfileField("englishLevel", event.target.value)}
                  />
                </label>
                <label className="wide">
                  Languages
                  <textarea
                    value={profileForm.languages}
                    onChange={(event) => updateProfileField("languages", event.target.value)}
                    rows={4}
                  />
                </label>
                <label className="wide">
                  Bio
                  <textarea
                    value={profileForm.bio}
                    onChange={(event) => updateProfileField("bio", event.target.value)}
                    rows={4}
                  />
                </label>
              </div>

              <div className="section-heading">
                <h3>Skills</h3>
              </div>
              <div className="form-grid">
              <label>
                Target roles
                <textarea
                  value={profileForm.targetRoles}
                  onChange={(event) => updateProfileField("targetRoles", event.target.value)}
                />
              </label>

              <label>
                Strong skills
                <textarea
                  value={profileForm.strongSkills}
                  onChange={(event) => updateProfileField("strongSkills", event.target.value)}
                />
              </label>

              <label>
                Secondary skills
                <textarea
                  value={profileForm.secondarySkills}
                  onChange={(event) => updateProfileField("secondarySkills", event.target.value)}
                />
              </label>

              <label>
                Engineering skills
                <textarea
                  value={profileForm.engineeringSkills}
                  onChange={(event) => updateProfileField("engineeringSkills", event.target.value)}
                />
              </label>

              <label>
                AI skills
                <textarea
                  value={profileForm.aiSkills}
                  onChange={(event) => updateProfileField("aiSkills", event.target.value)}
                />
              </label>

              <label>
                Avoid skills
                <textarea
                  value={profileForm.avoidSkills}
                  onChange={(event) => updateProfileField("avoidSkills", event.target.value)}
                />
              </label>
              </div>

              <div className="section-heading">
                <h3>Experience</h3>
              </div>
              <div className="form-grid">
                <label className="wide">
                  Experience summary
                  <textarea
                    value={profileForm.experienceSummary}
                    onChange={(event) =>
                      updateProfileField("experienceSummary", event.target.value)
                    }
                    rows={5}
                  />
                </label>

                <label className="wide">
                  Profile notes
                  <textarea
                    value={profileForm.profileNotes}
                    onChange={(event) => updateProfileField("profileNotes", event.target.value)}
                    rows={5}
                  />
                </label>
              </div>

              <div className="button-row">
                <button disabled={isBusy || !user} type="submit">
                  Save profile
                </button>
                <button disabled={isBusy || !user} type="button" onClick={loadProfile}>
                  Refresh
                </button>
              </div>
            </form>
          </section>
        ) : activeView === "import" ? (
          <section className="profile-panel">
            <div className="section-heading">
              <h2>Import/Paste</h2>
            </div>

            <form className="job-form" onSubmit={handleExtractJobs}>
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
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJob(job);
                        setActiveView("jobs");
                      }}
                    >
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
          </section>
        ) : activeView === "imports" ? (
          <section className="profile-panel">
            <div className="section-heading">
              <h2>Imports</h2>
              <button disabled={isBusy || !user} type="button" onClick={loadImportedEmails}>
                Refresh
              </button>
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
                <button disabled={isBusy || !user} type="button" onClick={handleStartGmailOAuth}>
                  Connect Gmail
                </button>
                <button
                  disabled={isBusy || !user || !gmailStatus?.connected}
                  type="button"
                  onClick={handleDisconnectGmail}
                >
                  Disconnect
                </button>
              </div>
            </section>

            <form className="job-form" onSubmit={handleImportFromGmail}>
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

            <form className="job-form" onSubmit={handleSimulateImportedEmail}>
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
                {importedEmails.length === 0 ? (
                  <p className="muted">No imported emails yet.</p>
                ) : null}
                <ul className="job-list">
                  {importedEmails.map((email) => (
                    <li key={email.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectImportedEmail(email);
                        }}
                      >
                        <span>
                          <strong>{email.subject}</strong>
                          <small>
                            Email from {email.fromName || email.fromEmail || email.providerMessageId}
                          </small>
                          <small>
                            Preview:{" "}
                            {email.snippet || previewText(email.bodyText ?? "") || "No preview saved."}
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
                          {selectedImportedEmail.fromName || selectedImportedEmail.fromEmail || "Unknown sender"}
                        </p>
                      </div>
                      <button
                        disabled={isBusy || !user || !selectedImportedEmail.bodyText?.trim()}
                        type="button"
                        onClick={() => void handleExtractImportedEmail(selectedImportedEmail.id)}
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJob(job);
                                setActiveView("jobs");
                              }}
                            >
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
        ) : (
          <section className="profile-panel">
            <div className="section-heading">
              <h2>Job Inbox</h2>
              <button disabled={isBusy || !user} type="button" onClick={loadJobs}>
                Refresh
              </button>
            </div>

            <form className="job-form" onSubmit={handleJobCreate}>
              <div className="form-grid">
                <label>
                  Company
                  <input
                    required
                    value={jobForm.company}
                    onChange={(event) => updateJobField("company", event.target.value)}
                  />
                </label>

                <label>
                  Title
                  <input
                    required
                    value={jobForm.title}
                    onChange={(event) => updateJobField("title", event.target.value)}
                  />
                </label>

                <label>
                  Location
                  <input
                    value={jobForm.location}
                    onChange={(event) => updateJobField("location", event.target.value)}
                  />
                </label>

                <label>
                  Remote type
                  <select
                    value={jobForm.remoteType}
                    onChange={(event) => updateJobField("remoteType", event.target.value)}
                  >
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
                    value={jobForm.salaryText}
                    onChange={(event) => updateJobField("salaryText", event.target.value)}
                  />
                </label>

                <label>
                  URL
                  <input
                    value={jobForm.url}
                    onChange={(event) => updateJobField("url", event.target.value)}
                    type="url"
                  />
                </label>

                <label className="wide">
                  Full description
                  <textarea
                    value={jobForm.fullDescription}
                    onChange={(event) => updateJobField("fullDescription", event.target.value)}
                    rows={6}
                  />
                </label>
              </div>

              <div className="button-row">
                <button disabled={isBusy || !user} type="submit">
                  Create job
                </button>
              </div>
            </form>

            <div className="filter-row" aria-label="Job filters">
              <label>
                User decision
                <select
                  value={userDecisionFilter}
                  onChange={(event) => setUserDecisionFilter(event.target.value)}
                >
                  <option value="">All decisions</option>
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
                  value={applicationStatusFilter}
                  onChange={(event) => setApplicationStatusFilter(event.target.value)}
                >
                  <option value="">All statuses</option>
                  {applicationStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="jobs-layout">
              <section>
                <h3>Active Jobs</h3>
                {jobs.length === 0 ? <p className="muted">No active jobs yet.</p> : null}
                {jobs.length > 0 && filteredJobs.length === 0 ? (
                  <p className="muted">No jobs match the selected filters.</p>
                ) : null}
                <ul className="job-list">
                  {filteredJobs.map((job) => (
                    <li key={job.id}>
                      <button type="button" onClick={() => void loadJob(job.id)}>
                        <span>
                          <strong>{job.title}</strong>
                          <small>{job.company}</small>
                        </span>
                        <span className="badge-row">
                          <em>{job.status}</em>
                          <em>{job.sourceQuality}</em>
                          <em>{job.applicationStatus ?? "not_started"}</em>
                          <em>{job.userDecision ?? "undecided"}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="job-detail" aria-label="Job detail">
                {selectedJob ? (
                  <>
                    <div className="section-heading">
                      <div>
                        <h3>{selectedJob.title}</h3>
                        <p className="muted">{selectedJob.company}</p>
                      </div>
                      <button
                        disabled={isBusy}
                        type="button"
                        onClick={() => void handleArchiveJob(selectedJob.id)}
                      >
                        Archive
                      </button>
                    </div>
                    <div className="button-row">
                      <button
                        disabled={isBusy || !user}
                        type="button"
                        onClick={() => void handleReviewJob(selectedJob.id)}
                      >
                        Run AI review
                      </button>
                    </div>
                    <dl className="detail-list">
                      <div>
                        <dt>Status</dt>
                        <dd>{selectedJob.status}</dd>
                      </div>
                      <div>
                        <dt>Source quality</dt>
                        <dd>{selectedJob.sourceQuality}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{selectedJob.location ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt>Remote</dt>
                        <dd>{selectedJob.remoteType}</dd>
                      </div>
                      <div>
                        <dt>Salary</dt>
                        <dd>{selectedJob.salaryText ?? "Not listed"}</dd>
                      </div>
                      <div>
                        <dt>URL</dt>
                        <dd>
                          {selectedJob.url ? (
                            <a href={selectedJob.url} rel="noreferrer" target="_blank">
                              {selectedJob.url}
                            </a>
                          ) : (
                            "Not listed"
                          )}
                        </dd>
                      </div>
                    </dl>
                    {selectedJob.sourceQuality !== "full_description" ? (
                      <p className="muted">
                        This job may only have an email summary. Paste the full description for
                        better AI review.
                      </p>
                    ) : null}
                    {selectedJob.status === "ready_for_analysis" && selectedJob.latestAiReview ? (
                      <p className="muted">
                        Job details changed. Rerun AI review for updated recommendation.
                      </p>
                    ) : null}
                    <form className="description-block pipeline-form" onSubmit={handleEnrichmentSave}>
                      <div className="section-heading">
                        <h4>Job Detail Enrichment</h4>
                      </div>

                      <div className="form-grid">
                        <label>
                          Original job URL
                          <input
                            value={enrichmentForm.url}
                            onChange={(event) =>
                              updateEnrichmentField("url", event.target.value)
                            }
                            type="url"
                          />
                        </label>

                        <label>
                          Language
                          <input
                            value={enrichmentForm.language}
                            onChange={(event) =>
                              updateEnrichmentField("language", event.target.value)
                            }
                          />
                        </label>

                        <label>
                          Source quality
                          <select
                            value={enrichmentForm.sourceQuality}
                            onChange={(event) =>
                              updateEnrichmentField("sourceQuality", event.target.value)
                            }
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
                            value={enrichmentForm.fullDescription}
                            onChange={(event) =>
                              updateEnrichmentField("fullDescription", event.target.value)
                            }
                            rows={8}
                          />
                        </label>
                      </div>

                      <div className="button-row">
                        <button disabled={isBusy || !user} type="submit">
                          Save enriched details
                        </button>
                        <button
                          disabled={isBusy || !user}
                          type="button"
                          onClick={() => void saveJobEnrichment(true)}
                        >
                          Save and run AI review
                        </button>
                      </div>
                    </form>
                    <form className="description-block pipeline-form" onSubmit={handlePipelineSave}>
                      <div className="section-heading">
                        <h4>Application Pipeline</h4>
                        <button disabled={isBusy || !user} type="submit">
                          Save pipeline
                        </button>
                      </div>

                      <div className="form-grid">
                        <label>
                          User decision
                          <select
                            value={pipelineForm.userDecision}
                            onChange={(event) =>
                              updatePipelineField("userDecision", event.target.value)
                            }
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
                            value={pipelineForm.applicationStatus}
                            onChange={(event) =>
                              updatePipelineField("applicationStatus", event.target.value)
                            }
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
                            value={pipelineForm.userNotes}
                            onChange={(event) =>
                              updatePipelineField("userNotes", event.target.value)
                            }
                            rows={4}
                          />
                        </label>

                        <label className="wide">
                          Next action
                          <textarea
                            value={pipelineForm.nextAction}
                            onChange={(event) =>
                              updatePipelineField("nextAction", event.target.value)
                            }
                            rows={3}
                          />
                        </label>

                        <label>
                          Follow-up date
                          <input
                            value={pipelineForm.followUpDate}
                            onChange={(event) =>
                              updatePipelineField("followUpDate", event.target.value)
                            }
                            type="date"
                          />
                        </label>
                      </div>

                      <dl className="detail-list">
                        <div>
                          <dt>Applied at</dt>
                          <dd>{formatDate(selectedJob.appliedAt)}</dd>
                        </div>
                        <div>
                          <dt>Rejected at</dt>
                          <dd>{formatDate(selectedJob.rejectedAt)}</dd>
                        </div>
                      </dl>
                    </form>
                    <div className="description-block">
                      <h4>Description</h4>
                      <p>{selectedJob.description?.fullText ?? "No full description saved."}</p>
                    </div>
                    <div className="description-block">
                      <h4>Latest AI Review</h4>
                      {selectedJob.latestAiReview ? (
                        <div className="review-block">
                          <dl className="detail-list">
                            <div>
                              <dt>Score</dt>
                              <dd>{selectedJob.latestAiReview.score}</dd>
                            </div>
                            <div>
                              <dt>Decision</dt>
                              <dd>{selectedJob.latestAiReview.decision}</dd>
                            </div>
                          </dl>
                          <p className="muted">
                            Overall score and decision are the final result. Fit breakdown shows
                            dimension-level reasoning.
                          </p>
                          <p>{selectedJob.latestAiReview.reviewText}</p>
                          <h5>Fit Breakdown</h5>
                          {selectedJob.latestAiReview.fitBreakdownJson ? (
                            <div className="fit-breakdown-grid">
                              {fitBreakdownRows.map(({ key, label }) => {
                                const item = selectedJob.latestAiReview?.fitBreakdownJson?.[key];

                                if (!item) {
                                  return null;
                                }

                                return (
                                  <div className="fit-breakdown-card" key={key}>
                                    <div className="fit-breakdown-heading">
                                      <strong>{label}</strong>
                                      <span className={`fit-verdict ${item.verdict}`}>
                                        {item.verdict}
                                      </span>
                                    </div>
                                    <div className="fit-breakdown-score">{item.score}</div>
                                    <p>{item.notes}</p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="muted">No fit breakdown for this review.</p>
                          )}
                          {selectedJob.sourceQuality !== "full_description" ? (
                            <p className="muted">
                              Review may be less reliable until job is enriched.
                            </p>
                          ) : null}
                          <h5>Risk flags</h5>
                          {selectedJob.latestAiReview.riskFlags.length > 0 ? (
                            <ul className="compact-list">
                              {selectedJob.latestAiReview.riskFlags.map((flag) => (
                                <li key={flag}>{flag}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted">No risk flags.</p>
                          )}
                          <h5>CV angle</h5>
                          <p>{selectedJob.latestAiReview.cvAngle}</p>
                          <h5>Clarification questions</h5>
                          {selectedJob.latestAiReview.clarificationQuestions.length > 0 ? (
                            <ul className="compact-list">
                              {selectedJob.latestAiReview.clarificationQuestions.map((question) => (
                                <li key={question}>{question}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted">No clarification questions.</p>
                          )}
                        </div>
                      ) : (
                        <p className="muted">No AI review yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="muted">Select a job to view details.</p>
                )}
              </section>
            </div>
          </section>
        )}
      </section>

      {status ? <p className="status success">{status}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </main>
  );
}
