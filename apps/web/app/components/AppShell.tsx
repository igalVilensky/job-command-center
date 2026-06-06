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
  { view: "dashboard", label: "Dashboard" },
  { view: "jobs", label: "Jobs" },
  { view: "imports", label: "Imports" },
  { view: "profile", label: "Profile" },
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
  if (!user) {
    return (
      <main className="page-shell signed-out-shell" data-api-url={apiUrl}>
        <header className="signed-out-header">
          <div className="brand-block">
            <p className="eyebrow">Milestone 15</p>
            <h1>Job Command Center</h1>
            <p className="api-pill">API: {apiUrl}</p>
          </div>
        </header>

        {status || error ? (
          <section className="alert-stack" aria-live="polite">
            {status ? <p className="status success">{status}</p> : null}
            {error ? <p className="status error">{error}</p> : null}
          </section>
        ) : null}

        <section className="workspace" aria-live="polite">
          <form className="login-panel" onSubmit={onLogin}>
            <div>
              <h2>Demo Login</h2>
              <p className="muted">Use the seeded local account.</p>
              <p className="demo-credentials">demo@jobcc.local / password123</p>
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
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell signed-in-shell" data-api-url={apiUrl}>
      <aside className="app-sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <p className="eyebrow">Milestone 15</p>
          <strong>JCC</strong>
        </div>

        <nav className="sidebar-nav">
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
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="brand-block">
            <h1>Job Command Center</h1>
            <p className="api-pill">API: {apiUrl}</p>
          </div>

          <div className="account-area" aria-label="Account">
            <span className="account-chip">{user.email}</span>
            <button className="button-secondary" disabled={isBusy} type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        {status || error ? (
          <section className="alert-stack" aria-live="polite">
            {status ? <p className="status success">{status}</p> : null}
            {error ? <p className="status error">{error}</p> : null}
          </section>
        ) : null}

        <section className="workspace" aria-live="polite">
          {children}
        </section>
      </div>
    </main>
  );
}
