import { useState, type FormEvent } from "react";
import { getErrorMessage, login, signup, type Task } from "../api";

type AuthMode = "login" | "signup";

type AuthScreenProps = {
  onAuthSuccess: (tasks: Task[]) => void;
};

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      if (authMode === "signup") {
        await signup({ email, password });
      } else {
        await login({ email, password });
      }

      setEmail("");
      setPassword("");

      // Fetch tasks after auth
      const response = await import("../api").then((m) => m.getTasks());
      onAuthSuccess(response.tasks);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  return (
    <main className="app-shell" data-testid="auth-screen">
      <h1>Kanban MVP</h1>
      <section className="auth-card" data-testid="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={authMode === "login" ? "active-tab" : ""}
            onClick={() => setAuthMode("login")}
            data-testid="auth-tab-login"
          >
            Log In
          </button>
          <button
            type="button"
            className={authMode === "signup" ? "active-tab" : ""}
            onClick={() => setAuthMode("signup")}
            data-testid="auth-tab-signup"
          >
            Sign Up
          </button>
        </div>

        <form className="stack" onSubmit={handleAuthSubmit} data-testid="auth-form">
          <label className="stack">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              data-testid="auth-email-input"
            />
          </label>

          <label className="stack">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              data-testid="auth-password-input"
            />
          </label>

          {authError ? <p className="error-banner">{authError}</p> : null}

          <button type="submit" disabled={isSubmittingAuth} data-testid="auth-submit-button">
            {isSubmittingAuth
              ? "Submitting..."
              : authMode === "signup"
                ? "Create account"
                : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
