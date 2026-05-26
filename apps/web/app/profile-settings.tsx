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
  const [loginForm, setLoginForm] = useState({
    email: "demo@jobcc.local",
    password: "password123"
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await request<{ user: User }>("/auth/me");
        setUser(data.user);
        await loadProfile();
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
      await loadProfile();
      setStatus("Signed in");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
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
      setProfileForm(emptyProfileForm);
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

  return (
    <main className="page-shell" data-api-url={apiUrl}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Milestone 03</p>
          <h1>Job Command Center</h1>
        </div>
        <p className="api-pill">API: {apiUrl}</p>
      </header>

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

        <form className="profile-panel" onSubmit={handleSave}>
          <div className="section-heading">
            <h2>Candidate Profile</h2>
            {profile ? <p className="muted">Updated {new Date(profile.updatedAt).toLocaleString()}</p> : null}
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
      </section>

      {status ? <p className="status success">{status}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </main>
  );
}
