import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";

import { type ActiveView, type User } from "./types";

type LoginFormState = {
  email: string;
  password: string;
};

type AppShellProps = {
  apiUrl: string;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  loginForm: LoginFormState;
  setLoginForm: Dispatch<SetStateAction<LoginFormState>>;
  user: User | null;
  isBusy: boolean;
  status: string;
  error: string;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  children: ReactNode;
};

const navItems: { view: ActiveView; label: string }[] = [
  { view: "profile", label: "Profile" },
  { view: "import", label: "Import" },
  { view: "jobs", label: "Job Queue" }
];

export function AppShell({
  apiUrl,
  activeView,
  setActiveView,
  loginForm,
  setLoginForm,
  user,
  isBusy,
  status,
  error,
  onLogin,
  onLogout,
  children
}: AppShellProps) {
  return (
    <main className="page-shell" data-api-url={apiUrl}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Milestone 12</p>
          <h1>Job Command Center</h1>
        </div>
        <p className="api-pill">API: {apiUrl}</p>
      </header>

      <nav className="tab-row" aria-label="Primary">
        {navItems.map((item) => (
          <button
            className={activeView === item.view ? "active" : ""}
            key={item.view}
            type="button"
            onClick={() => setActiveView(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="workspace" aria-live="polite">
        <form className="login-panel" onSubmit={onLogin}>
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
            <button disabled={isBusy || !user} type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>

          {user ? <p className="muted">Signed in as {user.email}</p> : null}
        </form>

        {children}
      </section>

      {status ? <p className="status success">{status}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </main>
  );
}
