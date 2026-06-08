"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AppShell } from "./components/AppShell";
import { CandidateProfilePanel } from "./components/CandidateProfilePanel";
import { DashboardPanel } from "./components/DashboardPanel";
import { ImportPanel } from "./components/ImportPanel";
import { JobCreateForm } from "./components/JobCreateForm";
import { JobDetailPanel } from "./components/JobDetailPanel";
import { JobFilters } from "./components/JobFilters";
import { JobQueuePanel } from "./components/JobQueuePanel";
import {
  type ActiveView,
  type AiReview,
  type CandidateCv,
  type CvFormState,
  type GmailImportFormState,
  type GmailImportResult,
  type GmailStatus,
  type ImportFormState,
  type ImportedEmail,
  type ImportedEmailFormState,
  type JobAlertProcessingFormState,
  type JobAlertProcessingSession,
  type Job,
  type JobDetailTab,
  type JobEnrichmentFormState,
  type JobFormState,
  type PipelineFormState,
  type Profile,
  type ProfileFormState,
  type QuickJobDecision,
  type QueueFilter,
  type User,
  cvToForm,
  defaultGmailImportForm,
  defaultJobAlertProcessingForm,
  defaultJobDetailTab,
  emptyCvForm,
  emptyImportedEmailForm,
  emptyImportForm,
  emptyJobForm,
  emptyPipelineForm,
  emptyProfileForm,
  jobToEnrichmentForm,
  jobToPipelineForm,
  jobIsStrongMatch,
  jobNeedsClarification,
  jobNeedsPipelineFollowUp,
  jobNeedsReview,
  previewText,
  profileToForm,
  sourceNeedsFullDescription,
  textToLanguages,
  textToList
} from "./components/types";

type LoginFormState = {
  email: string;
  password: string;
};

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
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [loginForm, setLoginForm] = useState<LoginFormState>({
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
  const [processingForm, setProcessingForm] =
    useState<JobAlertProcessingFormState>(defaultJobAlertProcessingForm);
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
  const [processingSession, setProcessingSession] =
    useState<JobAlertProcessingSession | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobDetailTab, setJobDetailTab] = useState<JobDetailTab>("overview");
  const [selectedImportedEmail, setSelectedImportedEmail] = useState<ImportedEmail | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [userDecisionFilter, setUserDecisionFilter] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");
  const [showNewJobForm, setShowNewJobForm] = useState(false);
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
    const data = await request<{ emails: ImportedEmail[] }>("/imports/emails?scope=all");
    setImportedEmails(data.emails);
    return data.emails;
  };

  const loadProcessingSession = async () => {
    const data = await request<{ session: JobAlertProcessingSession }>(
      "/processing/job-alert-session/current"
    );
    setProcessingSession(data.session);
    return data.session;
  };

  const loadGmailStatus = async () => {
    const data = await request<GmailStatus>("/gmail/status");
    setGmailStatus(data);
    return data;
  };

  const loadJob = async (id: string) => {
    const data = await request<{ job: Job }>(`/jobs/${id}`);
    setSelectedJob(data.job);
    return data.job;
  };

  const navigateToView = (view: ActiveView) => {
    setActiveView(view);
    setShowNewJobForm(false);

    if (view === "jobs") {
      setSelectedJob(null);
      return;
    }

    setSelectedJob(null);
  };

  const openJob = (job: Job, tab?: JobDetailTab) => {
    setSelectedJob(job);
    setJobDetailTab(tab ?? defaultJobDetailTab(job));
    setActiveView("jobs");
    void loadJob(job.id);
  };

  const openJobsWithFilter = (filter: QueueFilter) => {
    setQueueFilter(filter);
    setJobSearchQuery("");
    setUserDecisionFilter("");
    setApplicationStatusFilter("");
    setSelectedJob(null);
    setShowNewJobForm(false);
    setActiveView("jobs");
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
          loadGmailStatus(),
          loadProcessingSession()
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
    const reason = params.get("reason");

    if (!gmail) {
      return;
    }

    setActiveView("imports");

    if (gmail === "connected") {
      setStatus("Gmail connected");
      void loadGmailStatus();
    } else if (reason === "missing_gmail_scope") {
      setError("Gmail connection is missing read permission. Reconnect Gmail and approve Gmail read access.");
      void loadGmailStatus();
    } else {
      setError("Gmail connection failed");
    }

    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || processingSession?.status !== "running") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void Promise.all([loadProcessingSession(), loadImportedEmails(), loadJobs()]);
    }, 4000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, processingSession?.status]);

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
        loadGmailStatus(),
        loadProcessingSession()
      ]);
      setActiveView("dashboard");
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
      setJobDetailTab(defaultJobDetailTab(data.job));
      setShowNewJobForm(false);
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
        setJobDetailTab(defaultJobDetailTab(data.jobs[0]));
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
      await loadGmailStatus().catch(() => null);
      setError(importError instanceof Error ? importError.message : "Gmail import failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartProcessingSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setStatus("");

    const maxResults = Number(processingForm.maxResults);
    const reviewDelaySeconds = Number(processingForm.reviewDelaySeconds);

    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 25) {
      setError("Max results must be an integer between 1 and 25");
      setIsBusy(false);
      return;
    }

    if (
      !Number.isInteger(reviewDelaySeconds) ||
      reviewDelaySeconds < 0 ||
      reviewDelaySeconds > 3600
    ) {
      setError("Review delay seconds must be an integer between 0 and 3600");
      setIsBusy(false);
      return;
    }

    try {
      const data = await request<{ session: JobAlertProcessingSession }>(
        "/processing/job-alert-session/start",
        {
          method: "POST",
          body: JSON.stringify({
            gmailQuery: processingForm.gmailQuery || null,
            maxResults,
            reviewDelaySeconds
          })
        }
      );

      setProcessingSession(data.session);
      setStatus("Job-alert processing session started");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Processing session failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRefreshProcessingSession = async () => {
    setError("");

    try {
      await Promise.all([loadProcessingSession(), loadImportedEmails(), loadJobs()]);
      setStatus("Processing session refreshed");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Session refresh failed");
    }
  };

  const handleCancelProcessingSession = async () => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ session: JobAlertProcessingSession }>(
        "/processing/job-alert-session/cancel",
        {
          method: "POST"
        }
      );

      setProcessingSession(data.session);
      await Promise.all([loadImportedEmails(), loadJobs()]);
      setStatus("Processing session cancelled");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Session cancel failed");
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
      }>(`/imports/emails/${id}/extract`, {
        method: "POST"
      });

      setImportedEmailExtractedJobs(data.jobs);
      setImportedEmailWarnings(data.warnings);
      setSelectedImportedEmail(data.email);
      if (data.jobs[0]) {
        setSelectedJob(data.jobs[0]);
        setJobDetailTab(defaultJobDetailTab(data.jobs[0]));
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

  const handleTriageImportedEmail = async (
    id: string,
    inboxStatus: string,
    triageReason?: string | null
  ) => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ email: ImportedEmail }>(`/imports/emails/${id}/triage`, {
        method: "PATCH",
        body: JSON.stringify({
          inboxStatus,
          triageReason: triageReason ?? null
        })
      });

      setSelectedImportedEmail((current) => (current?.id === id ? data.email : current));
      await loadImportedEmails();
      setStatus("Imported email updated");
    } catch (triageError) {
      setError(triageError instanceof Error ? triageError.message : "Email triage failed");
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
      setJobDetailTab("review");
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
      setJobDetailTab("enrichment");
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
        setJobDetailTab("review");
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

      setSelectedJob((current) => (current?.id === id ? null : current));
      setJobDetailTab("overview");
      await loadJobs();
      setStatus("Job archived");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archive failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleQuickJobDecision = async (id: string, decision: QuickJobDecision) => {
    setIsBusy(true);
    setError("");
    setStatus("");

    try {
      const data = await request<{ job: Job }>(`/jobs/${id}/pipeline`, {
        method: "PATCH",
        body: JSON.stringify({
          userDecision: decision
        })
      });

      setSelectedJob((current) => (current?.id === id ? data.job : current));
      await loadJobs();
      setStatus(`Marked job ${decision === "not_interested" ? "not interested" : decision}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Quick decision failed");
    } finally {
      setIsBusy(false);
    }
  };

  const savePipeline = async () => {
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
          followUpDate: pipelineForm.followUpDate ? `${pipelineForm.followUpDate}T00:00:00.000Z` : null
        })
      });

      setSelectedJob(data.job);
      setJobDetailTab("pipeline");
      await loadJobs();
      setStatus("Pipeline saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pipeline save failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePipelineSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await savePipeline();
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
      setProcessingSession(null);
      setSelectedJob(null);
      setJobDetailTab("overview");
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
      setProcessingForm(defaultJobAlertProcessingForm);
      setPipelineForm(emptyPipelineForm);
      setActiveView("dashboard");
      setQueueFilter("all");
      setJobSearchQuery("");
      setUserDecisionFilter("");
      setApplicationStatusFilter("");
      setShowNewJobForm(false);
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

  const updateProcessingField = (field: keyof JobAlertProcessingFormState, value: string) => {
    setProcessingForm((current) => ({
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

  const matchesQueueFilter = (job: Job) => {
    if (queueFilter === "all") {
      return true;
    }

    if (queueFilter === "needs_description") {
      return sourceNeedsFullDescription(job);
    }

    if (queueFilter === "ready_for_review") {
      return jobNeedsReview(job);
    }

    if (queueFilter === "apply") {
      return jobIsStrongMatch(job);
    }

    if (queueFilter === "maybe") {
      return jobNeedsClarification(job);
    }

    if (queueFilter === "interested") {
      return job.userDecision === "interested";
    }

    if (queueFilter === "not_interested") {
      return job.userDecision === "not_interested";
    }

    return jobNeedsPipelineFollowUp(job);
  };

  const normalizedSearch = jobSearchQuery.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    const matchesDecision =
      !userDecisionFilter || (job.userDecision ?? "undecided") === userDecisionFilter;
    const matchesApplicationStatus =
      !applicationStatusFilter ||
      (job.applicationStatus ?? "not_started") === applicationStatusFilter;
    const searchableText = [
      job.title,
      job.company,
      job.location,
      job.remoteType,
      job.salaryText,
      job.sourceQuality,
      job.status,
      job.userDecision,
      job.applicationStatus,
      job.nextAction
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

    return matchesQueueFilter(job) && matchesDecision && matchesApplicationStatus && matchesSearch;
  });

  return (
    <AppShell
      activeView={activeView}
      apiUrl={apiUrl}
      error={error}
      isBusy={isBusy}
      loginForm={loginForm}
      onLogin={handleLogin}
      onLogout={() => void handleLogout()}
      setActiveView={navigateToView}
      setLoginForm={setLoginForm}
      status={status}
      user={user}
    >
      {activeView === "dashboard" ? (
        <DashboardPanel
          importedEmails={importedEmails}
          isBusy={isBusy}
          jobs={jobs}
          onCancelProcessingSession={() => void handleCancelProcessingSession()}
          onOpenImports={() => navigateToView("imports")}
          onOpenJobsFilter={openJobsWithFilter}
          onRefreshProcessingSession={() => void handleRefreshProcessingSession()}
          onStartProcessingSession={handleStartProcessingSession}
          processingForm={processingForm}
          processingSession={processingSession}
          updateProcessingField={updateProcessingField}
          user={user}
        />
      ) : activeView === "profile" ? (
        <CandidateProfilePanel
          activeCv={activeCv}
          cvForm={cvForm}
          isBusy={isBusy}
          onCvSave={handleCvSave}
          onProfileSave={handleProfileSave}
          onRefreshCv={loadCandidateCv}
          onRefreshProfile={loadProfile}
          profile={profile}
          profileForm={profileForm}
          toggleAcceptableRemoteType={toggleAcceptableRemoteType}
          updateCvField={updateCvField}
          updateProfileField={updateProfileField}
          user={user}
        />
      ) : activeView === "imports" ? (
        <ImportPanel
          extractedJobs={extractedJobs}
          gmailImportForm={gmailImportForm}
          gmailImportResult={gmailImportResult}
          gmailStatus={gmailStatus}
          importForm={importForm}
          importWarnings={importWarnings}
          importedEmailExtractedJobs={importedEmailExtractedJobs}
          importedEmailForm={importedEmailForm}
          importedEmailWarnings={importedEmailWarnings}
          importedEmails={importedEmails}
          isBusy={isBusy}
          jobs={jobs}
          onCancelProcessingSession={() => void handleCancelProcessingSession()}
          onDisconnectGmail={() => void handleDisconnectGmail()}
          onExtractImportedEmail={(id) => void handleExtractImportedEmail(id)}
          onExtractJobs={handleExtractJobs}
          onImportFromGmail={handleImportFromGmail}
          onOpenImports={() => navigateToView("imports")}
          onOpenJob={openJob}
          onOpenJobsFilter={openJobsWithFilter}
          onRefreshProcessingSession={() => void handleRefreshProcessingSession()}
          onRefreshImportedEmails={loadImportedEmails}
          onSelectImportedEmail={selectImportedEmail}
          onSimulateImportedEmail={handleSimulateImportedEmail}
          onStartProcessingSession={handleStartProcessingSession}
          onStartGmailOAuth={() => void handleStartGmailOAuth()}
          onTriageImportedEmail={(id, inboxStatus, triageReason) =>
            void handleTriageImportedEmail(id, inboxStatus, triageReason)
          }
          processingForm={processingForm}
          processingSession={processingSession}
          selectedImportedEmail={selectedImportedEmail}
          updateGmailImportField={updateGmailImportField}
          updateImportField={updateImportField}
          updateImportedEmailField={updateImportedEmailField}
          updateProcessingField={updateProcessingField}
          user={user}
        />
      ) : (
        <section className="jobs-page">
          {selectedJob ? (
            <JobDetailPanel
              activeTab={jobDetailTab}
              enrichmentForm={enrichmentForm}
              isBusy={isBusy}
              job={selectedJob}
              onBack={() => {
                setSelectedJob(null);
                setJobDetailTab("overview");
              }}
              onArchiveJob={(id) => void handleArchiveJob(id)}
              onEnrichmentSave={handleEnrichmentSave}
              onPipelineSave={handlePipelineSave}
              onPipelineQuickSave={() => void savePipeline()}
              onRunReview={(id) => void handleReviewJob(id)}
              onSaveAndReview={() => void saveJobEnrichment(true)}
              onTabChange={setJobDetailTab}
              pipelineForm={pipelineForm}
              updateEnrichmentField={updateEnrichmentField}
              updatePipelineField={updatePipelineField}
              user={user}
            />
          ) : (
            <>
              <div className="page-title-row">
                <div>
                  <h2>Jobs</h2>
                  <p className="muted">Scan active jobs and open only the ones you want to work on.</p>
                </div>
                <div className="button-row">
                  <button
                    className="button-secondary"
                    disabled={isBusy || !user}
                    type="button"
                    onClick={() => {
                      setSelectedJob(null);
                      setShowNewJobForm(true);
                    }}
                  >
                    New job
                  </button>
                  <button disabled={isBusy || !user} type="button" onClick={() => void loadJobs()}>
                    Refresh
                  </button>
                </div>
              </div>

              {showNewJobForm ? (
                <JobCreateForm
                  canCreate={Boolean(user)}
                  form={jobForm}
                  isBusy={isBusy}
                  onCancel={() => setShowNewJobForm(false)}
                  onSubmit={handleJobCreate}
                  updateField={updateJobField}
                />
              ) : null}

              <JobFilters
                applicationStatusFilter={applicationStatusFilter}
                searchQuery={jobSearchQuery}
                setApplicationStatusFilter={setApplicationStatusFilter}
                setSearchQuery={setJobSearchQuery}
                setUserDecisionFilter={setUserDecisionFilter}
                userDecisionFilter={userDecisionFilter}
              />

              <JobQueuePanel
                activeFilter={queueFilter}
                allJobs={jobs}
                isBusy={isBusy}
                jobs={filteredJobs}
                onFilterChange={setQueueFilter}
                onArchiveJob={(id) => void handleArchiveJob(id)}
                onEnrichJob={(job) => openJob(job, "enrichment")}
                onOpenJob={(job) => openJob(job)}
                onQuickDecision={(id, decision) => void handleQuickJobDecision(id, decision)}
                onRunReview={(id) => void handleReviewJob(id)}
                selectedJobId={null}
                totalJobs={jobs.length}
                user={user}
              />
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}
