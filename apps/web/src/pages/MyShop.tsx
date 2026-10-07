import { PageHeader } from "../components";

const TRUST_PILLS = [
  "Reads your shop data",
  "Only creates drafts you ask for",
  "Official Etsy OAuth",
  "Revoke anytime",
  "Multiple shops supported",
];

export default function MyShop() {
  return (
    <div>
      <PageHeader title="My Shop" sub="Connect your Etsy shop to unlock real sales insights." />

      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#fff",
          padding: 32,
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: 8 }}>Shop Insights</h2>
        <p style={{ color: "#c7d2fe", marginBottom: 16, maxWidth: 560 }}>
          See your revenue, orders, best-selling listings, and a map of where your buyers are —
          pulled securely from the official Etsy API. Your data is never shared — disconnect
          anytime.
        </p>
        <button className="btn btn-orange" disabled title="Shop OAuth coming soon">
          Connect your Etsy shop →
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {TRUST_PILLS.map((p) => (
            <span
              key={p}
              style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                color: "#e0e7ff",
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="stat-note">
          <strong>Note:</strong> Etsy's API exposes orders, listings and shop stats — but not
          page-visit/traffic analytics, so those aren't shown.
        </p>
        <p className="stat-note" style={{ marginTop: 8 }}>
          Shop connection uses official Etsy OAuth (read-only). To enable it, register an OAuth
          redirect in your Etsy app settings, then connect from here.
        </p>
      </div>
    </div>
  );
}
