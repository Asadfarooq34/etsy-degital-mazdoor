import { useState } from "react";
import { api, type RankCheckRow } from "../api";

export default function RankChecker() {
  const [shop, setShop] = useState("");
  const [keywords, setKeywords] = useState("");
  const [shopName, setShopName] = useState("");
  const [rows, setRows] = useState<RankCheckRow[] | null>(null);
  const [mode, setMode] = useState<"live" | "fixture">("fixture");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    if (!shop.trim() || !keywords.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.rankCheck(shop.trim(), keywords.trim());
      setRows(res.rows);
      setShopName(res.shop);
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
      <h1 className="page-title">Rank Checker</h1>
      <p className="page-sub">
        Where your shop's listings rank in Etsy search, per keyword.{" "}
        {mode === "fixture" ? (
          <span className="badge badge-fixture">FIXTURE DATA</span>
        ) : (
          <span className="badge badge-live">LIVE</span>
        )}
      </p>

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="shop">Shop ID or name</label>
            <input
              id="shop"
              className="input"
              placeholder="e.g. 12345678"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void check()}
            />
          </div>
          <div className="field">
            <label htmlFor="kws">Keywords (comma-separated, up to 10)</label>
            <input
              id="kws"
              className="input"
              placeholder="e.g. resume template, cover letter"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void check()}
            />
          </div>
          <button className="btn" onClick={() => void check()} disabled={loading}>
            {loading ? "Checking…" : "Check ranks"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {rows && (
        <div className="card">
          <h3>{shopName}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Best rank</th>
                <th>Listings in top 100</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keyword}>
                  <td>{r.keyword}</td>
                  <td>
                    {r.hits.length > 0 ? (
                      <span className="badge badge-pass">#{r.hits[0]!.rank}</span>
                    ) : (
                      <span className="stat-note">not ranked</span>
                    )}
                  </td>
                  <td>
                    {r.hits.length === 0 ? (
                      <span className="stat-note">—</span>
                    ) : (
                      r.hits.map((h) => (
                        <div key={h.listingId} style={{ marginBottom: 4 }}>
                          <a href={h.url} target="_blank" rel="noreferrer">
                            #{h.rank} — {h.title}
                          </a>
                        </div>
                      ))
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
