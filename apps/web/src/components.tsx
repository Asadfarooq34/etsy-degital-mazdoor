import type { ReactNode } from "react";

/** Consistent page header: title + subtitle + optional badge. */
export function PageHeader({
  title,
  sub,
  badge,
}: {
  title: string;
  sub?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      {(sub || badge) && (
        <p className="page-sub">
          {sub} {badge}
        </p>
      )}
    </div>
  );
}

/** Stat card with label, value, note. */
export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

/** Mode badge: LIVE vs FIXTURE. */
export function ModeBadge({ mode }: { mode: "live" | "fixture" }) {
  return mode === "fixture" ? (
    <span className="badge badge-fixture">FIXTURE DATA</span>
  ) : (
    <span className="badge badge-live">LIVE</span>
  );
}

/** Loading skeleton block. */
export function Skeleton({ height = 14, width = "100%" }: { height?: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} />;
}

/** Card skeleton for loading states. */
export function CardSkeleton() {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      <Skeleton height={18} width="40%" />
      <div style={{ marginTop: 12 }}>
        <Skeleton height={14} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton height={14} width="80%" />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton height={14} width="60%" />
      </div>
    </div>
  );
}

/** Polished empty state. */
export function EmptyState({
  icon = "🔍",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-icon">{icon}</div>
        <div className="empty-title">{title}</div>
        {hint && <div className="stat-note">{hint}</div>}
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </div>
  );
}

/** Button with built-in loading spinner. */
export function LoadingButton({
  loading,
  children,
  ...props
}: {
  loading: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn" disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? "Loading…" : children}
    </button>
  );
}
