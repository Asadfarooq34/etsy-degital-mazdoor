import { useEffect, useState } from "react";
import {
  api,
  type AdsRoiResult,
  type CategoryFinderResult,
  type KeywordList,
  type SeasonalCalendarResult,
} from "../api";

type Tab = "ads" | "category" | "seasonal" | "lists";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);

function AdsRoi() {
  const [spend, setSpend] = useState("");
  const [clicks, setClicks] = useState("");
  const [orders, setOrders] = useState("");
  const [aov, setAov] = useState("");
  const [res, setRes] = useState<AdsRoiResult | null>(null);

  const calc = async () => {
    setRes(
      await api.adsRoi({
        adSpend: num(spend),
        clicks: num(clicks),
        orders: num(orders),
        avgOrderValue: num(aov),
      }),
    );
  };

  return (
    <div className="card">
      <h3>Ads ROI</h3>
      <div className="row">
        <div className="field">
          <label>Ad spend ($)</label>
          <input className="input" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="50" />
        </div>
        <div className="field">
          <label>Clicks</label>
          <input className="input" value={clicks} onChange={(e) => setClicks(e.target.value)} placeholder="400" />
        </div>
        <div className="field">
          <label>Orders</label>
          <input className="input" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="8" />
        </div>
        <div className="field">
          <label>Avg order value ($)</label>
          <input className="input" value={aov} onChange={(e) => setAov(e.target.value)} placeholder="12" />
        </div>
        <button className="btn" onClick={() => void calc()}>
          Calculate
        </button>
      </div>
      {res && (
        <div className="stats" style={{ marginTop: 12 }}>
          <div className="stat">
            <div className="stat-label">ROI</div>
            <div className="stat-value">{res.roiPct}%</div>
            <div className="stat-note">
              {res.verdict === "profitable" ? (
                <span className="badge badge-pass">PROFITABLE</span>
              ) : res.verdict === "breaking-even" ? (
                <span className="badge badge-est">BREAKING EVEN</span>
              ) : (
                <span className="badge badge-fail">LOSING MONEY</span>
              )}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Profit</div>
            <div className="stat-value">${res.profit.toFixed(2)}</div>
            <div className="stat-note">revenue ${res.revenue.toFixed(2)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Conversion</div>
            <div className="stat-value">{res.conversionPct}%</div>
            <div className="stat-note">avg CPC ${res.avgCpc.toFixed(2)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Break-even</div>
            <div className="stat-value">{res.breakEvenOrders}</div>
            <div className="stat-note">orders needed</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryFinder() {
  const [kw, setKw] = useState("");
  const [res, setRes] = useState<CategoryFinderResult | null>(null);
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!kw.trim()) return;
    setLoading(true);
    try {
      setRes(await api.categoryFinder(kw.trim()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Category Finder</h3>
      <div className="row">
        <div className="field">
          <label>Keyword</label>
          <input
            className="input"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void go()}
            placeholder="e.g. resume template"
          />
        </div>
        <button className="btn" onClick={() => void go()} disabled={loading}>
          {loading ? "…" : "Find"}
        </button>
      </div>
      {res && (
        <div style={{ marginTop: 8 }}>
          <p className="stat-note">
            {res.mode === "live" ? <span className="badge badge-live">LIVE</span> : <span className="badge badge-fixture">FIXTURE</span>}{" "}
            Categories used by {res.sampleSize} listings:
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Taxonomy ID</th>
                <th>Share</th>
                <th>Example listing</th>
              </tr>
            </thead>
            <tbody>
              {res.categories.map((c) => (
                <tr key={c.taxonomyId}>
                  <td>{c.taxonomyId}</td>
                  <td>{c.sharePct}%</td>
                  <td className="stat-note">{c.exampleTitle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SeasonalCalendar() {
  const [kw, setKw] = useState("");
  const [res, setRes] = useState<SeasonalCalendarResult | null>(null);

  useEffect(() => {
    api.seasonalCalendar().then(setRes).catch(() => undefined);
  }, []);

  const go = async () => {
    setRes(await api.seasonalCalendar(kw.trim()));
  };

  return (
    <div className="card">
      <h3>Seasonal Calendar</h3>
      <div className="row">
        <div className="field">
          <label>Keyword (optional — adds its peak month)</label>
          <input
            className="input"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void go()}
            placeholder="e.g. christmas card"
          />
        </div>
        <button className="btn" onClick={() => void go()}>
          {res?.keywordPeak ? "Refresh" : "Add keyword peak"}
        </button>
      </div>
      {res?.keyword && (
        <p className="stat-note">
          &ldquo;{res.keyword}&rdquo; peaks in <strong>{res.keywordPeak ?? "—"}</strong> (Google Trends).
        </p>
      )}
      <table className="table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Period</th>
            <th>Focus</th>
            <th>Prep by</th>
          </tr>
        </thead>
        <tbody>
          {(res?.seasons ?? []).map((s) => (
            <tr key={s.period}>
              <td>
                <strong>{s.period}</strong>
              </td>
              <td>{s.focus}</td>
              <td className="stat-note">{s.prepBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeywordLists() {
  const [lists, setLists] = useState<KeywordList[]>([]);
  const [name, setName] = useState("");
  const [kws, setKws] = useState("");

  const refresh = async () => setLists((await api.keywordLists()).lists);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    await api.keywordListCreate(
      name.trim(),
      kws.split("\n").map((k) => k.trim()).filter(Boolean),
    );
    setName("");
    setKws("");
    await refresh();
  };

  const remove = async (id: number) => {
    await api.keywordListDelete(id);
    await refresh();
  };

  return (
    <div className="card">
      <h3>Keyword Lists</h3>
      <div className="row">
        <div className="field">
          <label>List name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q4 ideas" />
        </div>
        <button className="btn" onClick={() => void create()}>
          Save list
        </button>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Keywords (one per line)</label>
        <textarea className="input" rows={4} value={kws} onChange={(e) => setKws(e.target.value)} />
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {lists.map((l) => (
          <div key={l.id} className="card" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {l.name} <span className="stat-note">({l.keywords.length})</span>
              </strong>
              <button
                className="stat-note"
                style={{ cursor: "pointer", border: "none", background: "none" }}
                onClick={() => void remove(l.id)}
              >
                Delete
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {l.keywords.map((k) => (
                <span key={k} className="badge badge-est">
                  {k}
                </span>
              ))}
            </div>
          </div>
        ))}
        {lists.length === 0 && <p className="stat-note">No lists yet.</p>}
      </div>
    </div>
  );
}

export default function MoreTools() {
  const [tab, setTab] = useState<Tab>("ads");
  const tabs: { id: Tab; label: string }[] = [
    { id: "ads", label: "Ads ROI" },
    { id: "category", label: "Category Finder" },
    { id: "seasonal", label: "Seasonal Calendar" },
    { id: "lists", label: "Keyword Lists" },
  ];
  return (
    <div>
      <h1 className="page-title">More Tools</h1>
      <p className="page-sub">Small calculators and helpers for the Etsy workflow.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`badge ${tab === t.id ? "badge-live" : "badge-est"}`}
            style={{ cursor: "pointer", border: "none", padding: "8px 14px" }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "ads" && <AdsRoi />}
      {tab === "category" && <CategoryFinder />}
      {tab === "seasonal" && <SeasonalCalendar />}
      {tab === "lists" && <KeywordLists />}
    </div>
  );
}
