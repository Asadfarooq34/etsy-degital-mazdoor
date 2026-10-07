import { useEffect, useState } from "react";
import { api, type ShopVelocity, type TrackedShop } from "../api";

export default function CompetitorSales() {
  const [shopInput, setShopInput] = useState("");
  const [shops, setShops] = useState<TrackedShop[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [velocity, setVelocity] = useState<ShopVelocity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const res = await api.trackedShops();
      setShops(res.shops);
      if (res.shops.length > 0 && selected === null) {
        setSelected(res.shops[0]!.shopId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected === null) {
      setVelocity(null);
      return;
    }
    setLoading(true);
    api
      .shopVelocity(selected)
      .then(setVelocity)
      .catch((e) => setError(e instanceof Error ? e.message : "failed"))
      .finally(() => setLoading(false));
  }, [selected]);

  const track = async () => {
    if (!shopInput.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.trackShop(shopInput.trim());
      setShopInput("");
      await refresh();
      setSelected(res.shopId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  const untrack = async (shopId: number) => {
    await api.untrackShop(shopId);
    if (selected === shopId) setSelected(null);
    await refresh();
  };

  const snapshotNow = async () => {
    setLoading(true);
    try {
      await api.snapshotAll();
      await refresh();
      if (selected !== null) setVelocity(await api.shopVelocity(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  const maxDaily = velocity?.daily
    ? Math.max(1, ...velocity.daily.map((d) => d.sold))
    : 1;

  return (
    <div>
      <h1 className="page-title">Competitor Sales</h1>
      <p className="page-sub">
        Real sales velocity — lifetime sales differenced between daily snapshots.{" "}
        <span className="stat-note">Snapshots run daily while the API server runs.</span>
      </p>

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="shop">Track a shop (ID or name)</label>
            <input
              id="shop"
              className="input"
              placeholder="e.g. 12345678"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void track()}
            />
          </div>
          <button className="btn btn-green" onClick={() => void track()} disabled={loading}>
            {loading ? "…" : "Analyze →"}
          </button>
          <button
            className="btn"
            style={{ background: "var(--purple-100)", color: "var(--purple-700)" }}
            onClick={() => void snapshotNow()}
            disabled={loading}
          >
            Snapshot now
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {shops.length > 0 && (
        <div className="card">
          <h3>Tracked shops</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {shops.map((s) => (
              <span key={s.shopId} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button
                  className={`badge ${selected === s.shopId ? "badge-live" : "badge-est"}`}
                  style={{ cursor: "pointer", border: "none" }}
                  onClick={() => setSelected(s.shopId)}
                >
                  {s.shopName || `Shop #${s.shopId}`} · {s.snapshots} snapshots
                </button>
                <button
                  className="stat-note"
                  style={{ cursor: "pointer", border: "none", background: "none" }}
                  onClick={() => void untrack(s.shopId)}
                  title="Stop tracking"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {velocity?.needsMoreData && (
        <div className="card">
          <p className="stat-note">{velocity.note}</p>
          <p className="stat-note">Snapshots so far: {velocity.snapshots}</p>
        </div>
      )}

      {velocity?.velocity && velocity.header && (
        <div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Sold yesterday</div>
              <div className="stat-value">{velocity.velocity.soldYesterday}</div>
              <div className="stat-note">units</div>
            </div>
            <div className="stat">
              <div className="stat-label">Last 7 days</div>
              <div className="stat-value">{velocity.velocity.last7Days}</div>
              <div className="stat-note">units</div>
            </div>
            <div className="stat">
              <div className="stat-label">Last 30 days</div>
              <div className="stat-value">{velocity.velocity.last30Days}</div>
              <div className="stat-note">units</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg / day</div>
              <div className="stat-value">{velocity.velocity.avgPerDay}</div>
              <div className="stat-note">lifetime</div>
            </div>
            <div className="stat">
              <div className="stat-label">Lifetime sales</div>
              <div className="stat-value">{velocity.header.lifetimeSales.toLocaleString()}</div>
              <div className="stat-note">
                ★ {velocity.header.rating} · {velocity.header.reviewCount} reviews
              </div>
            </div>
          </div>

          {velocity.daily && velocity.daily.length > 0 && (
            <div className="card">
              <h3>Daily units sold</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
                {velocity.daily.map((d) => (
                  <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      title={`${d.date}: ${d.sold}`}
                      style={{
                        height: `${Math.max(3, (d.sold / maxDaily) * 110)}px`,
                        background: "var(--purple-600)",
                        borderRadius: "3px 3px 0 0",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="stat-note">
                Derived from Etsy's lifetime sales totals — directional, not exact.
              </p>
            </div>
          )}
        </div>
      )}

      {shops.length === 0 && !loading && (
        <p className="stat-note">
          No shops tracked yet. Add a competitor's shop ID above — snapshots start immediately
          and repeat daily.
        </p>
      )}
    </div>
  );
}
