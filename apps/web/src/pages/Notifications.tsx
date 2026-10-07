import { useState } from "react";
import { PageHeader } from "../components";

interface Notification {
  id: number;
  type: "message" | "update" | "deal" | "alert";
  title: string;
  body: string;
  time: string;
  read: boolean;
  group: "THIS WEEK" | "EARLIER";
}

// Local notification center. Keyword alerts from the Alerts tool land here.
const SEED: Notification[] = [];

const TYPE_COLORS: Record<string, string> = {
  message: "#2563eb",
  update: "#ea580c",
  deal: "#16a34a",
  alert: "#dc2626",
};

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>(SEED);
  const [filter, setFilter] = useState<string>("all");

  const unread = items.filter((i) => !i.read).length;
  const filtered = items.filter((i) => filter === "all" || (filter === "unread" ? !i.read : i.type === filter));

  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })));

  const groups: ("THIS WEEK" | "EARLIER")[] = ["THIS WEEK", "EARLIER"];

  return (
    <div>
      <PageHeader title="Notifications" sub="Replies, alerts, deals and updates in one place." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }} className="notif-grid">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <strong>All notifications {items.length}</strong>
            <span className="stat-note">Newest first</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <p style={{ fontWeight: 600 }}>No notifications yet</p>
              <p className="stat-note">
                Keyword alerts you track in the Alerts tool will show up here when search volume,
                competition or difficulty changes.
              </p>
            </div>
          ) : (
            groups.map((g) => {
              const inGroup = filtered.filter((i) => i.group === g);
              if (inGroup.length === 0) return null;
              return (
                <div key={g} style={{ marginBottom: 16 }}>
                  <div className="stat-note" style={{ fontWeight: 700, marginBottom: 8 }}>{g}</div>
                  {inGroup.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius)",
                        marginBottom: 8,
                        background: n.read ? "#fff" : "#fff7ed",
                        borderLeft: n.read ? "3px solid var(--border)" : "3px solid #ea580c",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{n.title}</strong>
                        <span className="stat-note">{n.time}</span>
                      </div>
                      <p className="stat-note" style={{ margin: "4px 0" }}>{n.body}</p>
                      <span
                        className="badge"
                        style={{ background: `${TYPE_COLORS[n.type]}18`, color: TYPE_COLORS[n.type] }}
                      >
                        {n.type}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Summary</h3>
            <p className="stat-note">{unread} unread · {items.length} in the last 30 days</p>
            <button className="btn btn-orange" onClick={markAllRead} style={{ marginTop: 8, width: "100%" }}>
              Mark all as read
            </button>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Show</h3>
            {[
              { id: "all", label: `All ${items.length}` },
              { id: "unread", label: `Unread ${unread}` },
              { id: "message", label: "Messages" },
              { id: "alert", label: "Keyword alerts" },
              { id: "deal", label: "Deals" },
              { id: "update", label: "Updates" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  marginBottom: 4,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: filter === f.id ? "#fff7ed" : "#fff",
                  fontFamily: "var(--font)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
