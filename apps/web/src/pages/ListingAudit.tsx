import { useState } from "react";
import { api, type ListingAuditResult } from "../api";
import { ModeBadge, PageHeader } from "../components";

function statusBadge(s: string) {
  const cls = s === "pass" ? "badge-pass" : s === "warn" ? "badge-est" : "badge-fail";
  return <span className={`badge ${cls}`}>{s.toUpperCase()}</span>;
}

export default function ListingAudit() {
  const [listingId, setListingId] = useState("");
  const [result, setResult] = useState<ListingAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const audit = async () => {
    if (!listingId.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.listingAudit(listingId.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Listing Audit"
        sub="Score any listing's SEO — title, tags, engagement, pricing."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="lid">Listing ID or URL</label>
            <input
              id="lid"
              className="input"
              placeholder="e.g. 123456789"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void audit()}
            />
          </div>
          <button className="btn btn-green" onClick={() => void audit()} disabled={loading}>
            {loading ? "Auditing…" : "Audit →"}
          </button>
        </div>
        <p className="stat-note">Paste the listing ID or the full Etsy listing URL.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: "var(--purple-700)" }}>
              {result.grade}
            </div>
            <div className="stat-note">
              SEO score: {result.score}/100 ·{" "}
              <a href={result.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)" }}>
                {result.title}
              </a>
            </div>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Detail</th>
                  <th>Tip</th>
                </tr>
              </thead>
              <tbody>
                {result.checks.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td>{c.detail}</td>
                    <td className="stat-note">{c.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
