import { useState } from "react";
import { api, type BulkRow } from "../api";

function avgViewsCell(v: BulkRow["avgViews"]) {
  if (typeof v === "number") return <>{v.toLocaleString()}</>;
  return (
    <>
      {v.value.toLocaleString()} <span className="badge badge-est">est.</span>
    </>
  );
}

export default function BulkKeywords() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [mode, setMode] = useState<"live" | "fixture">("fixture");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    const keywords = text.split("\n").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.bulkKeywords(keywords);
      setRows(res.rows);
      setMode(res.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Bulk Keywords</h1>
      <p className="page-sub">
        Up to 25 keywords, one per line — side-by-side difficulty and opportunity.{" "}
        {mode === "fixture" ? (
          <span className="badge badge-fixture">FIXTURE DATA</span>
        ) : (
          <span className="badge badge-live">LIVE</span>
        )}
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="bulk">Keywords (one per line, max 25)</label>
          <textarea
            id="bulk"
            className="input"
            rows={6}
            placeholder={"resume template\ncover letter\nbusiness card"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-purple" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Compare →"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {rows && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Competition</th>
                <th>Difficulty</th>
                <th>Opportunity</th>
                <th>Avg views</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keyword}>
                  <td>{r.keyword}</td>
                  <td>{r.competition.toLocaleString()}</td>
                  <td>{r.difficulty}</td>
                  <td>{r.opportunity}</td>
                  <td>{avgViewsCell(r.avgViews)}</td>
                  <td>
                    {r.difficultyPass ? (
                      <span className="badge badge-pass">PASS (&lt; 50)</span>
                    ) : (
                      <span className="badge badge-fail">FAIL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
