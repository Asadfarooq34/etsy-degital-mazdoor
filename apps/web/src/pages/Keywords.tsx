import { useState } from "react";
import { api, type KeywordOverview } from "../api";

function fmtViews(v: KeywordOverview["avgViews"]): { text: string; estimated: boolean } {
  if (typeof v === "number") return { text: v.toLocaleString(), estimated: false };
  return { text: v.value.toLocaleString(), estimated: true };
}

export default function Keywords() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<KeywordOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.keywordOverview(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Keywords</h1>
      <p className="page-sub">
        Keyword overview — competition, difficulty, opportunity. Teacher's rule: KD &lt; 50 passes.
      </p>

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
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
          </div>
          <button className="btn" onClick={() => void search()} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card">
            <h3>
              "{result.keyword}"{" "}
              {result.mode === "fixture" ? (
                <span className="badge badge-fixture">FIXTURE DATA</span>
              ) : (
                <span className="badge badge-live">LIVE</span>
              )}
            </h3>
            <div className="grid-4">
              <div className="stat">
                <div className="stat-label">Competition</div>
                <div className="stat-value">{result.competition.toLocaleString()}</div>
                <div className="stat-note">live listings on Etsy</div>
              </div>
              <div className="stat">
                <div className="stat-label">Difficulty</div>
                <div className="stat-value">{result.difficulty}</div>
                <div className="stat-note">
                  {result.difficultyPass ? (
                    <span className="badge badge-pass">PASS (&lt; 50)</span>
                  ) : (
                    <span className="badge badge-fail">FAIL (≥ 50)</span>
                  )}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg views</div>
                <div className="stat-value">
                  {fmtViews(result.avgViews).text}{" "}
                  {fmtViews(result.avgViews).estimated && (
                    <span className="badge badge-est">est.</span>
                  )}
                </div>
                <div className="stat-note">sample of {result.sampleSize} listings</div>
              </div>
              <div className="stat">
                <div className="stat-label">Opportunity</div>
                <div className="stat-value">{result.opportunity}</div>
                <div className="stat-note">0–100, higher is better</div>
              </div>
            </div>
          </div>
        </>
      )}

      {!result && !error && (
        <div className="card">
          <div className="empty">Enter a keyword above to see its overview.</div>
        </div>
      )}
    </div>
  );
}
