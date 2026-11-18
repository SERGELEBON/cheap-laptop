"use client";
/* Admin shell: Google sign-in gate, role-aware sidebar navigation, top bar. */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  Activity, Boxes, ExternalLink, LayoutDashboard, Loader2, LogOut, Menu, Package, ShieldCheck, ShoppingCart, Users, X,
} from "lucide-react";
import { Toasts } from "@/components/em/chrome";
import { useStore } from "@/lib/store";
import { ROLE_INFO, type Permission, type Role } from "@/lib/rbac";
import { Avatar, Button, Field, Input, RoleBadge, api, cx } from "./ui";
import { Overview } from "./Overview";
import { ProductsPage } from "./Products";
import { InventoryPage } from "./Inventory";
import { OrdersPage } from "./Orders";
import { StaffPage } from "./Staff";
import { ActivityPage } from "./Activity";

export interface Me {
  user: { id: number; email: string; name: string | null; image: string | null; role: Role };
  permissions: Permission[];
}

interface AdminCtx {
  me: Me;
  can: (p: Permission) => boolean;
  toast: (msg: string, kind?: "ok" | "info" | "err") => void;
  go: (section: Section) => void;
}
const Ctx = createContext<AdminCtx | null>(null);
export function useAdmin(): AdminCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminApp");
  return c;
}

type Section = "overview" | "products" | "inventory" | "orders" | "staff" | "activity";
const NAV: { key: Section; label: string; icon: typeof Package; perm: Permission; group: string }[] = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:view", group: "Store" },
  { key: "orders", label: "Orders", icon: ShoppingCart, perm: "orders:read", group: "Store" },
  { key: "products", label: "Products", icon: Package, perm: "products:read", group: "Catalogue" },
  { key: "inventory", label: "Inventory", icon: Boxes, perm: "stock:read", group: "Catalogue" },
  { key: "staff", label: "Staff & roles", icon: Users, perm: "staff:read", group: "Administration" },
  { key: "activity", label: "Activity log", icon: Activity, perm: "audit:read", group: "Administration" },
];

function inviteTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#\/admin\/invite\/([A-Za-z0-9_-]{20,100})/);
  return m ? m[1] : null;
}

function sectionFromHash(): Section {
  if (typeof window === "undefined") return "overview";
  const s = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[1] as Section | undefined;
  return NAV.some((n) => n.key === s) ? (s as Section) : "overview";
}

export function AdminApp() {
  const toast = useStore((s) => s.toast);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [status, setStatus] = useState<{ googleConfigured: boolean; dbDown: boolean }>({ googleConfigured: true, dbDown: false });
  const [section, setSection] = useState<Section>(sectionFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(inviteTokenFromHash);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setMe(d as Me);
        else {
          setStatus({ googleConfigured: d.googleConfigured !== false, dbDown: res.status === 503 });
          setMe(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus((s) => ({ ...s, dbDown: true }));
        setMe(null);
      });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const onHash = () => { setSection(sectionFromHash()); setInviteToken(inviteTokenFromHash()); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((s: Section) => {
    window.location.hash = s === "overview" ? "#/admin" : `#/admin/${s}`;
    setSection(s);
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  }, []);

  if (inviteToken) return <AcceptInvite token={inviteToken} />;
  if (me === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 size={28} className="animate-spin text-[var(--em-red)]" /></div>;
  }
  if (me === null) return <SignIn googleConfigured={status.googleConfigured} dbDown={status.dbDown} />;

  const can = (p: Permission) => me.permissions.includes(p);
  const nav = NAV.filter((n) => can(n.perm));
  const current = nav.some((n) => n.key === section) ? section : nav[0]?.key ?? "overview";
  const groups = [...new Set(nav.map((n) => n.group))];

  const logout = async (all = false) => {
    await fetch(`/api/admin/logout${all ? "?all=1" : ""}`, { method: "POST" }).catch(() => {});
    setMe(null);
  };

  const sidebar = (
    <nav className="flex flex-col h-full" aria-label="Admin navigation">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/10">
        <span className="bg-white rounded-lg px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cl/logo.svg" alt="Cheap Laptops" className="h-7" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 border border-white/20 rounded px-1.5 py-0.5">Admin</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/40">{g}</div>
            {nav.filter((n) => n.group === g).map((n) => (
              <button
                key={n.key}
                onClick={() => go(n.key)}
                aria-current={current === n.key ? "page" : undefined}
                className={cx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors",
                  current === n.key ? "bg-white text-[#0b1f3a] shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <n.icon size={17} /> {n.label}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-white/10">
        <a href="#/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/70 hover:bg-white/10 hover:text-white">
          <ExternalLink size={16} /> View store
        </a>
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={{ me, can, toast, go }}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-[248px] bg-[#0b1f3a] z-30">{sidebar}</aside>
        {/* mobile sidebar */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileNav(false)} />
            <aside className="absolute inset-y-0 left-0 w-[260px] bg-[#0b1f3a]">
              <button onClick={() => setMobileNav(false)} className="absolute right-3 top-4 text-white/70 p-1" aria-label="Close menu"><X size={20} /></button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="lg:pl-[248px]">
          <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 lg:px-8">
            <button onClick={() => setMobileNav(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100" aria-label="Open menu"><Menu size={20} /></button>
            <div className="text-[13px] text-slate-500 hidden sm:block">Cheap Laptops Ghana</div>
            <div className="ml-auto flex items-center gap-3">
              <UserMenu me={me} onLogout={logout} />
            </div>
          </header>
          <main className="px-4 lg:px-8 py-6 max-w-[1400px]">
            {current === "overview" && <Overview />}
            {current === "products" && <ProductsPage />}
            {current === "inventory" && <InventoryPage />}
            {current === "orders" && <OrdersPage />}
            {current === "staff" && <StaffPage />}
            {current === "activity" && <ActivityPage />}
          </main>
        </div>
        <Toasts />
      </div>
    </Ctx.Provider>
  );
}

function UserMenu({ me, onLogout }: { me: Me; onLogout: (all?: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const u = me.user;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full sm:rounded-lg sm:pl-1 sm:pr-3 sm:py-1 hover:bg-slate-100" aria-expanded={open} aria-haspopup="menu">
        <Avatar name={u.name} email={u.email} image={u.image} size={32} />
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-[13px] font-semibold text-slate-800 max-w-[160px] truncate">{u.name || u.email}</span>
          <span className="block text-[11px] text-slate-500">{ROLE_INFO[u.role].label}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 mt-2 w-[270px] bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-[13px] font-semibold truncate">{u.name || u.email}</div>
              <div className="text-[12px] text-slate-500 truncate">{u.email}</div>
              <div className="mt-2"><RoleBadge role={u.role} /></div>
            </div>
            <button role="menuitem" onClick={() => onLogout(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-slate-50"><LogOut size={15} /> Sign out</button>
            <button role="menuitem" onClick={() => onLogout(true)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-slate-50 text-slate-600"><ShieldCheck size={15} /> Sign out of all devices</button>
          </div>
        </>
      )}
    </div>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  not_invited: "This Google account isn't authorised. Ask an administrator to invite your email.",
  disabled: "Your access has been disabled. Contact an administrator.",
  email_unverified: "Your Google email address isn't verified.",
  account_mismatch: "This email is linked to a different Google account.",
  invalid_state: "The sign-in session expired. Please try again.",
  cancelled: "Sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  not_configured: "Google sign-in is being activated. For now, please sign in with your email and password.",
  server_error: "Something went wrong on our side. Please try again.",
};

function SignIn({ googleConfigured, dbDown }: { googleConfigured: boolean; dbDown: boolean }) {
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const code = new URLSearchParams(window.location.search).get("auth_error");
    return code ? AUTH_ERRORS[code] || AUTH_ERRORS.server_error : null;
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    /* drop ?auth_error from the address bar once it has been shown */
    if (window.location.search.includes("auth_error")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold text-slate-900">Staff sign in</h1>
      <p className="text-[13.5px] text-slate-500 mt-1.5 mb-7">Choose how you want to sign in.</p>
      {(error || dbDown) && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-4" role="alert">
          {error || "The admin database is unavailable. Please try again shortly."}
        </div>
      )}
      {/* Option 1 — Google (any Google account, Gmail or not) */}
      <a
        href={googleConfigured ? "/api/auth/google" : undefined}
        onClick={(e) => { if (!googleConfigured) { e.preventDefault(); setError(AUTH_ERRORS.not_configured); } }}
        className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg py-3 text-[14px] font-semibold text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-colors cursor-pointer"
      >
        <GoogleIcon /> Continue with Google
      </a>

      <div className="flex items-center gap-3 my-6 text-[12px] font-medium text-slate-400 uppercase tracking-wide">
        <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Option 2 — email + password */}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email address">
          <Input type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-slate-700">Password</span>
            <button type="button" onClick={() => setShowHelp((v) => !v)} className="text-[12.5px] font-semibold text-[var(--em-red)] hover:underline">Forgot password?</button>
          </div>
          <div className="relative mt-1">
            <Input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-16" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1" aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {showHelp && (
          <div className="text-[12.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3">
            For security, passwords are reset by an administrator: ask them for a <b>reset link</b> (Staff &amp; roles → Reset link). It works once and expires after 72 hours.
          </div>
        )}
        <Button type="submit" variant="primary" loading={busy} className="w-full !py-3 !text-[14px]">Sign in</Button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-[12.5px] text-slate-500">
        <b className="text-slate-700">First time here?</b> Open the invitation link you received by WhatsApp or email to create your password — or use “Continue with Google” if your invited email is a Google account.
      </div>
      <p className="text-[11.5px] text-slate-400 mt-4">Access is by invitation only. Every action is recorded.</p>
      <div className="mt-6"><Button variant="ghost" size="sm" onClick={() => (window.location.hash = "#/")}>← Back to the store</Button></div>
    </AuthLayout>
  );
}

function AcceptInvite({ token }: { token: string }) {
  const [info, setInfo] = useState<{ email: string; name: string | null; role: string; mode: "invite" | "reset" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ email: string; name: string | null; role: string; mode: "invite" | "reset" }>("/api/auth/invite", { method: "POST", json: { token } })
      .then((d) => { if (!cancelled) setInfo(d); })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await api("/api/auth/invite", { method: "POST", json: { token, password: pw, name: name.trim() || undefined } });
      window.location.replace("/#/admin");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {!info && !error && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[var(--em-red)]" /></div>}
      {!info && error && (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">Link expired</h1>
          <p className="text-[13.5px] text-slate-500 mt-2">{error}</p>
          <div className="mt-6"><Button onClick={() => (window.location.hash = "#/admin")}>Go to sign in</Button></div>
        </>
      )}
      {info && (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">{info.mode === "reset" ? "Choose a new password" : "Welcome to the team"}</h1>
          <p className="text-[13.5px] text-slate-500 mt-1.5 mb-6">
            {info.mode === "reset" ? "Set a new password for " : "You've been invited as "}
            {info.mode === "invite" && <b className="text-slate-700">{info.role}</b>}
            {info.mode === "invite" ? " — " : ""}<b className="text-slate-700">{info.email}</b>
          </p>
          {error && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-4" role="alert">{error}</div>}
          <form onSubmit={submit} className="space-y-3.5">
            <input type="email" value={info.email} autoComplete="username" readOnly hidden />
            {info.mode === "invite" && !info.name && <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
            <Field label="Password" hint="At least 10 characters, with letters and numbers."><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
            <Field label="Confirm password"><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></Field>
            <Button type="submit" variant="primary" loading={busy} className="w-full !py-3">{info.mode === "reset" ? "Save and sign in" : "Create my access"}</Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-[#0b1f3a] text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[var(--em-red)]/30 blur-3xl" />
        <div className="relative inline-flex w-fit bg-white rounded-xl px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cl/logo.svg" alt="Cheap Laptops Ghana" className="h-8" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight">Run your store<br />from one place.</h2>
          <p className="text-white/70 mt-3 max-w-sm text-[14px]">Orders, catalogue, stock levels and your team — with access tailored to each role.</p>
        </div>
        <p className="text-white/40 text-[12px] relative">© {new Date().getFullYear()} Cheap Laptops Ghana</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cl/logo.svg" alt="Cheap Laptops Ghana" className="h-10 mb-8 lg:hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/* re-export for convenience */
export { api };
