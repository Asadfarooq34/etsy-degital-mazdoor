import {
  Component,
  useEffect,
  useId,
  useRef,
} from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ErrorInfo,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/* ============================================================================
   DIGITAL MAZDUR — DESIGN SYSTEM components
   Tokens: src/design-tokens.css (--dm-*). Visual layer: index.css.
   Everything here is typed, dependency-free, and additive — existing exports
   (PageHeader, StatCard, ModeBadge, Skeleton, CardSkeleton, EmptyState,
   LoadingButton) are unchanged.

   PAGE HEADER GUIDELINE (audit L14):
   - NEW pages MUST use <PageHeader title sub badge /> — never a raw
     <h1 className="page-title">.
   - title = the page name as it appears in the sidebar.
   - sub   = one short sentence describing what the page does.
   - badge = optional <ModeBadge mode={...}/> or status <Badge/>.
   - Phase 3 will migrate the remaining raw-h1 pages; do not mix patterns
     inside a single page.
   ============================================================================ */

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

/* ----------------------------------------------------------------------------
   Logo — original "DM" monogram. Geometric letterforms on a purple rounded
   square. Do NOT copy or reuse any third-party brand mark.
   ---------------------------------------------------------------------------- */
export function Logo({ size = 38, title = "Digital Mazdur" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id="dm-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#dm-logo-grad)" />
      <path
        d="M13 13 h5.5 a11.5 11.5 0 0 1 0 23 H13 z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinejoin="round"
      />
      <path
        d="M27 36 V13 L32.5 22 L38 13 V36"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   Button — variants: primary / secondary / ghost / danger; sizes sm / md / lg.
   loading renders a spinner and disables the button.
   ---------------------------------------------------------------------------- */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, size === "md" ? "" : `btn-${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------------------
   Form fields — Input / Textarea / Select with label, hint, and error state.
   ---------------------------------------------------------------------------- */
type FieldMeta = {
  label?: string;
  hint?: string;
  error?: string;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: FieldMeta & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error ? (
        <div className="field-error" id={`${id}-err`} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export type InputProps = FieldMeta & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, hint, error, id: idProp, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={`input${error ? " input-error" : ""}${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export type TextareaProps = FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, hint, error, id: idProp, className = "", ...rest }: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={`textarea${error ? " textarea-error" : ""}${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export type SelectProps = FieldMeta & SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ label, hint, error, id: idProp, className = "", children, ...rest }: SelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={`select${error ? " select-error" : ""}${className ? ` ${className}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/* ----------------------------------------------------------------------------
   Card — standard card with optional header (title, subtitle, actions).
   ---------------------------------------------------------------------------- */
export function Card({
  title,
  sub,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`}>
      {(title != null || actions != null) && (
        <div className="card-head">
          <div>
            {title != null && <h3 className="card-title">{title}</h3>}
            {sub != null && <p className="card-sub">{sub}</p>}
          </div>
          {actions != null && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Badge — colored pill. Tones: green / red / blue / amber / gray / purple.
   ---------------------------------------------------------------------------- */
export type BadgeTone = "green" | "red" | "blue" | "amber" | "gray" | "purple";

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ----------------------------------------------------------------------------
   Modal — accessible dialog. Closes on overlay click and Escape.
   ---------------------------------------------------------------------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  width?: number;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ "--dm-modal-width": `${width}px` } as CSSProperties}
      >
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions != null && <div className="modal-foot">{actions}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Tooltip — pure-CSS tooltip. Wrap any element; `tip` is the tooltip text.
   ---------------------------------------------------------------------------- */
export function Tooltip({
  tip,
  children,
  position = "top",
}: {
  tip: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <span className="dm-tip" data-tip={tip} data-pos={position} tabIndex={0}>
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------
   TableSkeleton — loading placeholder for tables.
   ---------------------------------------------------------------------------- */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="table-skeleton-row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? "30%" : "100%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   ErrorState — icon + message + retry button for failed loads.
   ---------------------------------------------------------------------------- */
export function ErrorState({
  icon = "⚠️",
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  icon?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="card">
      <div className="error-state">
        <div className="error-icon" aria-hidden="true">
          {icon}
        </div>
        <div className="error-title">{title}</div>
        {message != null && <div className="error-msg">{message}</div>}
        {onRetry != null && (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Spinner — standalone loading indicator. `dark` for light backgrounds.
   ---------------------------------------------------------------------------- */
export function Spinner({ dark = false, label = "Loading" }: { dark?: boolean; label?: string }) {
  return <span className={dark ? "spinner-dark" : "spinner"} role="status" aria-label={label} />;
}

/* ----------------------------------------------------------------------------
   Toggle — accessible switch. Checkbox — styled checkbox with label.
   ---------------------------------------------------------------------------- */
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label?: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="dm-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="dm-toggle-track" aria-hidden="true" />
      {label != null && <span>{label}</span>}
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="dm-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/* ----------------------------------------------------------------------------
   Alert — inline success / error / warning / info message.
   ---------------------------------------------------------------------------- */
export type AlertTone = "success" | "error" | "warning" | "info";

const ALERT_ICONS: Record<AlertTone, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

export function Alert({
  tone,
  children,
  icon,
}: {
  tone: AlertTone;
  children: ReactNode;
  icon?: string;
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="alert-icon" aria-hidden="true">
        {icon ?? ALERT_ICONS[tone]}
      </span>
      <div>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   ErrorBoundary — catches render exceptions so one broken page can no
   longer unmount the entire app (audit M12).
   ---------------------------------------------------------------------------- */
type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (info: { error: Error; reset: () => void }) => ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Digital Mazdur] Uncaught render error:", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error != null) {
      if (this.props.fallback != null) {
        return this.props.fallback({ error, reset: this.reset });
      }
      return (
        <div className="card">
          <div className="error-state">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            <div className="error-title">This page ran into a problem</div>
            <div className="error-msg">{error.message || "An unexpected render error occurred."}</div>
            <Button variant="secondary" onClick={this.reset}>
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
