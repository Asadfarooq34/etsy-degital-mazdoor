import { useState } from "react";
import { api } from "../api";

/**
 * Login gate — the only thing rendered until /api/auth/status says the
 * session is valid. Single-user: one password (ADMIN_PASSWORD on the API).
 */
export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      setPassword("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} autoComplete="off">
        <div className="login-brand">
          <div className="brand-mark login-mark">DM</div>
          <div>
            <div className="login-title">Digital Mazdoor</div>
            <div className="login-sub">Etsy research toolkit</div>
          </div>
        </div>
        <h1 className="login-heading">Sign in</h1>
        <p className="login-hint">
          This is your personal tool — enter your admin password to continue.
        </p>
        <label className="login-label" htmlFor="dm-password">
          Password
        </label>
        <input
          id="dm-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-purple login-btn" type="submit" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="login-foot">
          Locked out? Set <code>ADMIN_PASSWORD</code> in <code>apps/api/.env</code> and restart
          the API.
        </p>
      </form>
    </div>
  );
}
