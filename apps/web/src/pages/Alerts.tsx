import { useEffect, useState } from "react";
import { api, type AlertItem } from "../api";
import { Badge, EmptyState, ErrorState, PageHeader } from "../components";

export default function Alerts() {
  const [kwInput, setKwInput] = useState("");
  const [tracked, setTracked] = useState<{ keyword: string }[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const [t, a] = await Promise.all([api.alertsTracked(), api.alertsList()]);
    setTracked(t.keywords);
    setAlerts(a.alerts);
    setUnreadCount(a.unreadCount);
  };

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  const track = async () => {
    if (!kwInput.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.alertsTrack(kwInput.trim());
      setKwInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  const untrack = async (keyword: string) => {
    await api.alertsUntrack(keyword);
    await refresh();
  };

  const checkNow = async () => {
    setLoading(true);
    setError("");
    try {
      await api.alertsCheck();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await api.alertsMarkRead([]);
    await refresh();
  };

  return (
    <div>
      <PageHeader
        title="Alerts"
        sub="Get notified when tracked keywords change (competition ±20%, difficulty crossing 50)."
        badge={unreadCount > 0 ? <Badge tone="red">{unreadCount} unread</Badge> : undefined}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="kw">Track a keyword (up to 30)</label>
            <input
              id="kw"
              className="input"
              placeholder="e.g. resume template"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void track()}
            />
          </div>
          <button className="btn btn-orange" onClick={() => void track()} disabled={loading}>
            {loading ? "Tracking…" : "Track"}
          </button>
          <button
            className="btn"
            style={{ background: "var(--purple-100)", color: "var(--purple-700)" }}
            onClick={() => void checkNow()}
            disabled={loading}
          >
            {loading ? "Checking…" : "Check now"}
          </button>
        </div>
        <p className="stat-note">Checks also run daily while the API server runs.</p>
      </div>

      {error && <ErrorState message={error} onRetry={() => void refresh()} />}

      {tracked.length > 0 && (
        <div className="card">
          <h3>Tracked keywords</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tracked.map((t) => (
              <span key={t.keyword} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-est">{t.keyword}</span>
                <button
                  className="stat-note"
                  style={{ cursor: "pointer", border: "none", background: "none" }}
                  onClick={() => void untrack(t.keyword)}
                  title="Stop tracking"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <button className="btn" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          )}
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No alerts yet"
            hint="Changes are detected on each check. New alerts also appear in the Notifications page."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Keyword</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={a.read ? { opacity: 0.6 } : undefined}>
                  <td className="stat-note">{a.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td>{a.keyword}</td>
                  <td>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
