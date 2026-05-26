"use client";

import { type FormEvent, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
};

type Profile = {
  id: string;
  targetRoles: string[];
  strongSkills: string[];
  avoidSkills: string[];
  minimumSalaryEur: number | null;
  preferredLocations: string[];
  remotePreference: string | null;
  germanLevel: string | null;
  englishLevel: string | null;
  profileNotes: string | null;
  updatedAt: string;
};

type JobDescription = {
  summaryText: string | null;
  fullText: string | null;
  rawSourceText: string | null;
  language: string | null;
};

type AiReview = {
  id: string;
  score: number;
  decision: string;
  reviewText: string;
  riskFlags: string[];
  cvAngle: string;
  clarificationQuestions: string[];
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
  importedAt: string;
  updatedAt: string;
  archivedAt: string | null;
  description: JobDescription | null;
  latestAiReview: AiReview | null;
};

type ProfileFormState = {
  targetRoles: string;
  strongSkills: string;
  avoidSkills: string;
  minimumSalaryEur: string;
  preferredLocations: string;
  remotePreference: string;
  germanLevel: string;
  englishLevel: string;
  profileNotes: string;
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

type ImportFormState = {
  sourceText: string;
  sourceType: string;
  sourceName: string;
};

type ActiveView = "profile" | "import" | "jobs";

const emptyProfileForm: ProfileFormState = {
  targetRoles: "",
  strongSkills: "",
  avoidSkills: "",
  minimumSalaryEur: "",
  preferredLocations: "",
  remotePreference: "",
  germanLevel: "",
  englishLevel: "",
  profileNotes: ""
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

const emptyImportForm: ImportFormState = {
  sourceText: "",
  sourceType: "paste",
  sourceName: ""
};

const remoteTypeOptions = [
  "unknown",
  "remote",
  "remote_first",
  "hybrid",
  "homeoffice_possible",
  "onsite"
];

const listToText = (items: string[]) => items.join(", ");

const textToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const profileToForm = (profile: Profile): ProfileFormState => ({
  targetRoles: listToText(profile.targetRoles),
  strongSkills: listToText(profile.strongSkills),
  avoidSkills: listToText(profile.avoidSkills),
  minimumSalaryEur: profile.minimumSalaryEur ? String(profile.minimumSalaryEur) : "",
  preferredLocations: listToText(profile.preferredLocations),
  remotePreference: profile.remotePreference ?? "",
  germanLevel: profile.germanLevel ?? "",
  englishLevel: profile.englishLevel ?? "",
  profileNotes: profile.profileNotes ?? ""
});

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : undefined;

    throw new Error(message ?? `Request failed with ${response.status}`);
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
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJobForm);
  const [importForm, setImportForm] = useState<ImportFormState>(emptyImportForm);
  const [extractedJobs, setExtractedJobs] = useState<Job[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
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

  const loadJobs = async () => {
    const data = await request<{ jobs: Job[] }>("/jobs");
    setJobs(data.jobs);
    return data.jobs;
  };

  const loadJob = async (id: string) => {
    const data = await request<{ job: Job }>(`/jobs/${id}`);
    setSelectedJob(data.job);
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await request<{ user: User }>("/auth/me");
        setUser(data.user);
        await Promise.all([loadProfile(), loadJobs()]);
      } catch {
        setUser(null);
      }
    };

    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await Promise.all([loadProfile(), loadJobs()]);
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

    const salaryText = profileForm.minimumSalaryEur.trim();
    const salary = salaryText ? Number(salaryText) : null;

    if (salary !== null && (!Number.isInteger(salary) || salary <= 0)) {
      setError("Minimum salary must be a positive integer");
      setIsBusy(false);
      return;
    }

    try {
      const data = await request<{ profile: Profile }>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          targetRoles: textToList(profileForm.targetRoles),
          strongSkills: textToList(profileForm.strongSkills),
          avoidSkills: textToList(profileForm.avoidSkills),
          minimumSalaryEur: salary,
          preferredLocations: textToList(profileForm.preferredLocations),
          remotePreference: profileForm.remotePreference.trim() || null,
          germanLevel: profileForm.germanLevel.trim() || null,
          englishLevel: profileForm.englishLevel.trim() || null,
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
      setJobs([]);
      setSelectedJob(null);
      setExtractedJobs([]);
      setImportWarnings([]);
      setProfileForm(emptyProfileForm);
      setJobForm(emptyJobForm);
      setImportForm(emptyImportForm);
      setStatus("Signed out");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Logout failed");
    } finally {
      setIsBusy(false);
    }
  };

  const updateProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((current) => ({
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

  const updateImportField = (field: keyof ImportFormState, value: string) => {
    setImportForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  return (
    <main className="page-shell" data-api-url={apiUrl}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Milestone 05</p>
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
          <form className="profile-panel" onSubmit={handleProfileSave}>
            <div className="section-heading">
              <h2>Candidate Profile</h2>
              {profile ? (
                <p className="muted">Updated {new Date(profile.updatedAt).toLocaleString()}</p>
              ) : null}
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
                Avoid skills
                <textarea
                  value={profileForm.avoidSkills}
                  onChange={(event) => updateProfileField("avoidSkills", event.target.value)}
                />
              </label>

              <label>
                Preferred locations
                <textarea
                  value={profileForm.preferredLocations}
                  onChange={(event) => updateProfileField("preferredLocations", event.target.value)}
                />
              </label>

              <label>
                Minimum salary EUR
                <input
                  value={profileForm.minimumSalaryEur}
                  onChange={(event) => updateProfileField("minimumSalaryEur", event.target.value)}
                  inputMode="numeric"
                />
              </label>

              <label>
                Remote preference
                <input
                  value={profileForm.remotePreference}
                  onChange={(event) => updateProfileField("remotePreference", event.target.value)}
                />
              </label>

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
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
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

            <div className="jobs-layout">
              <section>
                <h3>Active Jobs</h3>
                {jobs.length === 0 ? <p className="muted">No active jobs yet.</p> : null}
                <ul className="job-list">
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <button type="button" onClick={() => void loadJob(job.id)}>
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
                          <p>{selectedJob.latestAiReview.reviewText}</p>
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
