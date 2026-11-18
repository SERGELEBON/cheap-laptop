"use client";
/* Admin design system: small, consistent primitives used across the dashboard. */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from "lucide-react";
import { ROLE_INFO, type Role } from "@/lib/rbac";

/* ---------------- formatting ---------------- */
export const ghs = (pesewas: number | null | undefined) =>
  pesewas == null ? "—" : "GH₵ " + (pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const toPesewas = (v: string) => Math.round((parseFloat(String(v).replace(/,/g, "")) || 0) * 100);
export const fromPesewas = (v: number | null | undefined) => (v == null ? "" : (v / 100).toFixed(2));
export const fmtDate = (d: string | Date) => new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtNum = (n: number) => n.toLocaleString("en-GH");
export function timeAgo(d: string | Date | null): string {
  if (!d) return "never";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-GB");
}

/* ---------------- API ---------------- */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Fetches `url` whenever it changes; `reload()` refetches. Keeps the previous
    data visible while a new request is in flight. */
export function useApi<T>(url: string | null) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });
  const key = url ? `${url}#${nonce}` : null;
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    api<T>(url)
      .then((d) => { if (!cancelled) setState({ key: `${url}#${nonce}`, data: d, error: null }); })
      .catch((e) => { if (!cancelled) setState((s) => ({ key: `${url}#${nonce}`, data: s.data, error: e instanceof Error ? e.message : "Failed to load" })); });
    return () => { cancelled = true; };
  }, [url, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, error: state.key === key ? state.error : null, loading: state.key !== key, reload };
}

/** Current page that automatically resets to 1 whenever `filterKey` changes. */
export function usePage(filterKey: string): [number, (p: number) => void] {
  const [s, set] = useState({ key: filterKey, page: 1 });
  const page = s.key === filterKey ? s.page : 1;
  return [page, (p: number) => set({ key: filterKey, page: p })];
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ---------------- primitives ---------------- */
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
export function Button({
  variant = "secondary", size = "md", loading, icon: Icon, children, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean; icon?: React.ComponentType<{ size?: number }> }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-[var(--em-red)] text-white hover:bg-[var(--em-red-dark)] border-transparent shadow-sm",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 border rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--em-red)]/40",
        size === "sm" ? "text-[12.5px] px-2.5 py-1.5" : "text-[13px] px-3.5 py-2",
        styles[variant],
        className
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={size === "sm" ? 14 : 15} /> : null}
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
          {title && <h3 className="text-[14px] font-bold text-slate-800">{title}</h3>}
          {actions}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ color, children, dot }: { color: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color, background: `${color}14` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "#d97706", processing: "#1656ce", shipped: "#7c3aed", delivered: "#16a34a", cancelled: "#dc2626",
};
export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge color={ORDER_STATUS_COLORS[status] || "#64748b"} dot><span className="capitalize">{status}</span></Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const r = ROLE_INFO[role];
  return <Badge color={r.color}>{r.label}</Badge>;
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) return <Badge color="#dc2626" dot>Out of stock</Badge>;
  if (stock <= threshold) return <Badge color="#d97706" dot>Low · {stock}</Badge>;
  return <Badge color="#16a34a" dot>In stock · {stock}</Badge>;
}

export const PRODUCT_STATUS_COLORS: Record<string, string> = { ACTIVE: "#16a34a", DRAFT: "#64748b", ARCHIVED: "#94a3b8" };
export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge color={PRODUCT_STATUS_COLORS[status] || "#64748b"}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function Avatar({ name, email, image, size = 32 }: { name?: string | null; email: string; image?: string | null; size?: number }) {
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-[var(--em-red)]/10 text-[var(--em-red)] font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center justify-center py-16", className)}>
      <Loader2 size={26} className="animate-spin text-[var(--em-red)]" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto"><Icon size={22} className="text-slate-400" /></div>
      <p className="text-slate-800 font-semibold mt-3 text-[14px]">{title}</p>
      {text && <p className="text-slate-500 text-[13px] mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      text={message}
      action={onRetry && <Button icon={RefreshCw} onClick={onRetry}>Retry</Button>}
    />
  );
}

export function Pagination({ page, per, total, onPage }: { page: number; per: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / per));
  if (total === 0) return null;
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-[12.5px] text-slate-500">
      <span>{from}–{to} of {fmtNum(total)}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center disabled:opacity-40 hover:bg-slate-50" aria-label="Previous page"><ChevronLeft size={15} /></button>
        <span className="px-1">Page {page} / {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center disabled:opacity-40 hover:bg-slate-50" aria-label="Next page"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

/* ---------------- forms ---------------- */
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-[13.5px] bg-white outline-none focus:border-[var(--em-red)] focus:ring-2 focus:ring-[var(--em-red)]/15 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="text-[12.5px] font-semibold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="text-[11.5px] text-red-600 mt-1 block">{error}</span> : hint ? <span className="text-[11.5px] text-slate-400 mt-1 block">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[90px]", props.className)} />;
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "pr-8", props.className)}>{children}</select>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-[340px]">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(inputCls, "pl-9")} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-4 px-4">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
            value === it.value ? "border-[var(--em-red)] text-[var(--em-red)]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1.5 text-[11px] bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- overlays ---------------- */
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cx("relative bg-white rounded-2xl shadow-2xl w-full my-auto", wide ? "max-w-[760px]" : "max-w-[460px]")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-[15.5px] text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger, onConfirm, onClose }: { title: string; message: React.ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-[13.5px] text-slate-600 leading-relaxed">{message}</div>
    </Modal>
  );
}

/* table helpers */
export const th = "text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 px-4 py-2.5 bg-slate-50 border-b border-slate-200 whitespace-nowrap";
export const td = "px-4 py-3 border-b border-slate-100 align-middle";
