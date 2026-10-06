import { useEffect, useState } from "react";
import { api, type Health } from "../api";

export default function Overview() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "API unreachable"));
  }, []);

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">
        Digital Mazdoor — your personal, local-only Etsy research toolkit. Every number is
        measured live; estimates are always labeled <span className="badge badge-est">est.</span>
      </p>

      {error && <div className="error">{error} — is the API server running? (npm run dev:api)</div>}

      <div className="grid-4">
        <div className="stat">
          <div className="stat-label">API server</div>
          <div className="stat-value">{health ? "Online" : "…"}</div>
          <div className="stat-note">http://127.0.0.1:3001</div>
        </div>
        <div className="stat">
          <div className="stat-label">Etsy data mode</div>
          <div className="stat-value">
            {health ? (
              health.etsy === "live" ? (
                <span className="badge badge-live">LIVE</span>
              ) : (
                <span className="badge badge-fixture">FIXTURE</span>
              )
            ) : (
              "…"
            )}
          </div>
          <div className="stat-note">{health?.note ?? "checking…"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tracked keywords</div>
          <div className="stat-value">0</div>
          <div className="stat-note">tracking starts once the key is active</div>
        </div>
        <div className="stat">
          <div className="stat-label">Snapshots stored</div>
          <div className="stat-value">0</div>
          <div className="stat-note">SQLite · local only</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Build status</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Project scaffold (TypeScript strict, tests, git)</td>
              <td>
                <span className="badge badge-live">done</span>
              </td>
            </tr>
            <tr>
              <td>Core formulas (KD, opportunity, heat index, fees) + tests</td>
              <td>
                <span className="badge badge-live">done</span>
              </td>
            </tr>
            <tr>
              <td>Fee calculator (end-to-end)</td>
              <td>
                <span className="badge badge-live">done</span>
              </td>
            </tr>
            <tr>
              <td>Live Etsy data</td>
              <td>
                <span className="badge badge-fixture">waiting on key approval</span>
              </td>
            </tr>
            <tr>
              <td>Keyword research, tracking, AI agent</td>
              <td>
                <span className="badge badge-fixture">next phases</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
