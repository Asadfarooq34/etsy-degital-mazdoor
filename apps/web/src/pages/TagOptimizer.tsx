import { useState } from "react";
import { api, type TagOptimizerResult } from "../api";
import { ModeBadge, PageHeader } from "../components";

function verdictBadge(v: string) {
  const cls =
    v === "Strong" ? "badge-pass" : v === "Moderate" ? "badge-est" : v === "Weak" ? "badge-fail" : "badge-fixture";
  return <span className={`badge ${cls}`}>{v}</span>;
}

export default function TagOptimizer() {
  const [keyword, setKeyword] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<TagOptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.tagOptimizer(keyword.trim(), tags));
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
        title="Tag Optimizer"
        sub="Score your 13 tags against the tags the top-ranking listings actually use."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="kw">Keyword</label>
            <input
              id="kw"
              className="input"
              placeholder="e.g. resume template"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="tags">Your tags (comma-separated, up to 13)</label>
            <input
              id="tags"
              className="input"
              placeholder="resume template, cv template, …"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <button className="btn" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Scoring…" : "Score tags"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card">
            <h3>
              Tag score: {result.score}/100{" "}
              <span
                className={`badge ${result.score >= 60 ? "badge-pass" : result.score >= 30 ? "badge-est" : "badge-fail"}`}
              >
                {result.score >= 60 ? "Good" : result.score >= 30 ? "Fair" : "Weak"}
              </span>
            </h3>
            <p className="stat-note">
              {result.scoreNote} Based on {result.sampleSize} top listings.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Your tag</th>
                  <th>Verdict</th>
                  <th>Listings using it</th>
                  <th>Adoption</th>
                </tr>
              </thead>
              <tbody>
                {result.tags.map((t) => (
                  <tr key={t.tag}>
                    <td style={{ fontWeight: 600 }}>{t.tag}</td>
                    <td>{verdictBadge(t.verdict)}</td>
                    <td>{t.listingsUsing}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, minWidth: 80 }}>
                          <div
                            style={{
                              width: `${t.adoption}%`,
                              height: "100%",
                              background: "var(--purple-600)",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <span>{t.adoption}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Tags you&apos;re missing</h3>
            <p className="stat-note">
              High-adoption tags from top listings that aren&apos;t in your list.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.suggestions.map((s) => (
                <span key={s.tag} className="badge badge-est" style={{ fontSize: 12, padding: "6px 12px" }}>
                  {s.tag} · {s.adoption}%
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
