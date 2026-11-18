"use client";
/* Admin dashboard — overview, products CRUD, order management.
   Auth: server-signed httpOnly cookie; all mutations validated server-side. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore, money } from "@/lib/store";
import {
  LayoutDashboard, Package, ShoppingCart, LogOut, ExternalLink, RefreshCw, Search,
  Plus, Pencil, Trash2, X, TrendingUp, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Lock, User,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

/* ---------------- helpers ---------------- */
const ghs = (pesewas: number) => "GH\u20B5 " + (pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toPesewas = (v: string) => Math.round((parseFloat(v.replace(/,/g, "")) || 0) * 100);

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#1656ce",
  shipped: "#7c3aed",
  delivered: "#16a34a",
  cancelled: "#dc2626",
};

interface Stats {
  revenueTotal: number;
  ordersCount: number;
  productsCount: number;
  lowStockCount: number;
  lowStock: { id: number; name: string; stock: number }[];
  byStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number }[];
  recentOrders: { ref: string; customerName: string; totalFmt: string; status: string; payment: string; createdAt: string }[];
  topProducts: { name: string; qty: number }[];
}

interface PRow {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price: number;
  regularPrice: number | null;
  image: string | null;
  categorySlugs: string;
  brandSlug: string | null;
  shortDescription: string;
  description: string;
  stock: number;
  featured: boolean;
  onSale: boolean;
  discount: number;
}

interface ORow {
  id: number;
  ref: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  region: string;
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  createdAt: string;
  items: { id: number; name: string; qty: number; price: number }[];
}

type Tab = "overview" | "products" | "orders";

/* ================= component ================= */
export function AdminApp() {
  const [authed, setAuthed] = useState<undefined | null | string>(undefined); // undefined = checking, null = logged out
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAuthed(d.username))
      .catch(() => setAuthed(null));
  }, []);

  if (authed === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={30} className="animate-spin text-[var(--em-red)]" />
      </div>
    );
  }
  if (authed === null) return <LoginForm onLogin={(u) => setAuthed(u)} />;

  return (
    <div className="min-h-[70vh] bg-[#f5f7fb]">
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#0b1f3a]">Admin Dashboard</h1>
            <p className="text-[13px] text-gray-500">Cheap Laptops Ghana — signed in as <b>{authed}</b></p>
          </div>
          <div className="flex items-center gap-2">
            <a href="#/" className="text-[13px] font-semibold border rounded-md px-3 py-2 bg-white hover:bg-gray-50 flex items-center gap-1.5">
              <ExternalLink size={14} /> View site
            </a>
            <button
              onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthed(null); }}
              className="text-[13px] font-semibold border rounded-md px-3 py-2 bg-white hover:bg-red-50 hover:text-red-600 flex items-center gap-1.5"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[210px_1fr] gap-5 items-start">
          <nav className="bg-white border rounded-lg p-2 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Admin">
            {([
              ["overview", "Overview", LayoutDashboard],
              ["products", "Products", Package],
              ["orders", "Orders", ShoppingCart],
            ] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-[13.5px] font-semibold whitespace-nowrap transition-colors ${tab === k ? "bg-[var(--em-red)] text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
          <div>
            {tab === "overview" && <Overview />}
            {tab === "products" && <ProductsAdmin />}
            {tab === "orders" && <OrdersAdmin />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= login ================= */
function LoginForm({ onLogin }: { onLogin: (u: string) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onLogin(data.username);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#f5f7fb] flex items-center justify-center px-3">
      <form onSubmit={submit} className="bg-white border rounded-xl shadow-sm w-full max-w-[400px] p-8">
        <img src="/images/cl/logo.svg" alt="Cheap Laptops" className="h-11 mb-6" />
        <h1 className="text-lg font-extrabold text-[#0b1f3a]">Admin sign in</h1>
        <p className="text-[13px] text-gray-500 mt-1 mb-5">Restricted area — authorized staff only.</p>
        <label className="block mb-3">
          <span className="text-[12.5px] font-semibold text-gray-600">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]"
            required
          />
        </label>
        <label className="block mb-4">
          <span className="text-[12.5px] font-semibold text-gray-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]"
            required
          />
        </label>
        {err && <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-3">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white font-bold py-3 rounded transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-[11px] text-gray-400 mt-4 text-center">Default password is set via the ADMIN_PASSWORD environment variable.</p>
      </form>
    </div>
  );
}

/* ================= overview ================= */
function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setErr(false);
    try {
      const r = await fetch("/api/admin/stats");
      if (!r.ok) throw new Error();
      setStats(await r.json());
    } catch {
      setErr(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (err) return <EmptyState icon={AlertTriangle} title="Could not load statistics" action={load} />;
  if (!stats) return <SectionLoading />;

  const cards = [
    { label: "Total revenue", value: ghs(stats.revenueTotal), icon: TrendingUp, tint: "bg-[#eaf1fd] text-[var(--em-red)]" },
    { label: "Orders", value: String(stats.ordersCount), icon: ShoppingCart, tint: "bg-[#fff6e0] text-[#b45309]" },
    { label: "Products", value: String(stats.productsCount), icon: Package, tint: "bg-[#e8f7ef] text-[#15803d]" },
    { label: "Low stock (≤2)", value: String(stats.lowStockCount), icon: AlertTriangle, tint: "bg-[#fdeaea] text-[#b91c1c]" },
  ];
  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] text-gray-500 font-medium">{c.label}</div>
              <div className="text-[19px] font-black text-[#0b1f3a] mt-1 whitespace-nowrap">{c.value}</div>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.tint}`}>
              <c.icon size={18} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Revenue — last 14 days (GH₵)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.revenueByDay} margin={{ top: 5, right: 10, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={62} />
              <Tooltip formatter={(v) => ghs(Number(v) * 100)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#1656ce" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Orders by status">
          {statusData.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-16 text-center">No orders yet — they will appear here after the first checkout.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name.toLowerCase()] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Best-selling products (units)">
          {stats.topProducts.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-16 text-center">No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="qty" fill="#1656ce" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Recent orders">
          {stats.recentOrders.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-16 text-center">No orders yet.</p>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="text-gray-400">
                <tr><th className="text-left font-semibold py-2">Ref</th><th className="text-left font-semibold py-2">Customer</th><th className="text-right font-semibold py-2">Total</th><th className="text-right font-semibold py-2">Status</th></tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.ref} className="border-t">
                    <td className="py-2.5 font-bold text-[var(--em-red)]">{o.ref}</td>
                    <td className="py-2.5 text-gray-600 max-w-[140px] truncate">{o.customerName}</td>
                    <td className="py-2.5 text-right font-bold whitespace-nowrap">{ghs(Number(o.totalFmt) * 100)}</td>
                    <td className="py-2.5 text-right"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {stats.lowStock.length > 0 && (
        <Card title="Low stock alerts">
          <ul className="divide-y text-[13px]">
            {stats.lowStock.slice(0, 6).map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-gray-700 truncate">{p.name}</span>
                <span className={`font-bold shrink-0 ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-[13.5px] font-bold text-[#0b1f3a] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || "#94a3b8";
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold capitalize" style={{ color: c }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{status}</span>;
}

function SectionLoading() {
  return (
    <div className="bg-white border rounded-lg p-10 flex items-center justify-center">
      <Loader2 size={26} className="animate-spin text-[var(--em-red)]" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, action }: { icon: typeof Package; title: string; action?: () => void }) {
  return (
    <div className="bg-white border rounded-lg p-14 text-center">
      <Icon size={40} className="mx-auto text-gray-300" />
      <p className="text-gray-500 mt-3 text-[14px]">{title}</p>
      {action && (
        <button onClick={action} className="mt-4 text-[13px] font-semibold text-[var(--em-red)] hover:underline inline-flex items-center gap-1.5">
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}

/* ================= products ================= */
const PAGE_PER = 10;

function ProductsAdmin() {
  const { toast } = useStore();
  const [rows, setRows] = useState<PRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<PRow | null>(null);

  const load = useCallback(async (p: number, search: string) => {
    await Promise.resolve();
    setRows(null);
    try {
      const res = await fetch(`/api/admin/products?page=${p}&per=${PAGE_PER}&q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRows(d.rows);
      setTotal(d.total);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => { load(page, query); }, [load, page, query]);

  const pages = Math.max(1, Math.ceil(total / PAGE_PER));

  const remove = async (p: PRow) => {
    const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast(`Deleted "${p.name.slice(0, 30)}…"`); setDeleting(null); load(page, query); }
    else toast("Delete failed", "err");
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form
          className="flex border rounded-md overflow-hidden flex-1 max-w-[360px]"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU or brand…" className="flex-1 px-3 py-2 text-[13px] outline-none" aria-label="Search products" />
          <button type="submit" className="bg-gray-100 hover:bg-gray-200 px-3" aria-label="Search"><Search size={15} /></button>
        </form>
        <span className="text-[12.5px] text-gray-400 ml-1">{total} products</span>
        <button onClick={() => setEditing("new")} className="ml-auto bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white text-[13px] font-bold px-3.5 py-2 rounded-md flex items-center gap-1.5">
          <Plus size={15} /> New product
        </button>
      </div>

      {!rows ? (
        <SectionLoading />
      ) : rows.length === 0 ? (
        <EmptyState icon={Package} title="No products match your search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead className="bg-[#f7f8fb] text-gray-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2.5 rounded-l-md">Product</th>
                <th className="text-left font-semibold px-3 py-2.5">SKU</th>
                <th className="text-right font-semibold px-3 py-2.5">Price</th>
                <th className="text-center font-semibold px-3 py-2.5">Stock</th>
                <th className="text-center font-semibold px-3 py-2.5">Status</th>
                <th className="text-right font-semibold px-3 py-2.5 rounded-r-md">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 border rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {p.image ? <img src={p.image} alt="" className="max-h-full max-w-full object-contain" /> : null}
                      </div>
                      <span className="font-semibold text-[#232630] line-clamp-1 max-w-[260px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{p.sku}</td>
                  <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">{ghs(p.price)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-bold ${p.stock === 0 ? "text-red-600" : p.stock <= 2 ? "text-amber-600" : "text-gray-700"}`}>{p.stock}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">{p.onSale ? <span className="text-[11px] font-bold text-[var(--em-red)]">-{p.discount}%</span> : <span className="text-[11px] text-gray-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-[var(--em-red)]" aria-label={`Edit ${p.name}`}><Pencil size={15} /></button>
                    <button onClick={() => setDeleting(p)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 ml-1" aria-label={`Delete ${p.name}`}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span className="text-[12.5px] text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button>
        </div>
      )}

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(page, query); }}
          toast={toast}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleting(null)} />
          <div className="relative bg-white rounded-lg p-6 w-full max-w-[420px]">
            <h3 className="font-bold text-[15px] text-[#232630]">Delete product?</h3>
            <p className="text-[13px] text-gray-500 mt-2">“{deleting.name}” will be permanently removed from the catalog. This cannot be undone.</p>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setDeleting(null)} className="border rounded-md px-4 py-2 text-[13px] font-semibold hover:bg-gray-50">Cancel</button>
              <button onClick={() => remove(deleting)} className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 text-[13px] font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductDialog({ product, onClose, onSaved, toast }: { product: PRow | null; onClose: () => void; onSaved: () => void; toast: (m: string, k?: "ok" | "info" | "err") => void }) {
  const isNew = !product;
  const [f, setF] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    slug: product?.slug || "",
    priceGhs: product ? (product.price / 100).toString() : "",
    regularGhs: product?.regularPrice ? (product.regularPrice / 100).toString() : "",
    stock: product ? String(product.stock) : "10",
    image: product?.image || "",
    categorySlugs: product?.categorySlugs || "laptops",
    brandSlug: product?.brandSlug || "",
    shortDescription: product?.shortDescription || "",
    description: product?.description || "",
    featured: product?.featured || false,
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  const save = async () => {
    const price = toPesewas(f.priceGhs);
    const regularPrice = f.regularGhs ? toPesewas(f.regularGhs) : null;
    const stock = parseInt(f.stock, 10) || 0;
    if (!f.name.trim() || price <= 0) { toast("Name and a valid price are required", "err"); return; }
    if (!isNew && (!f.sku.trim() || !f.slug.trim())) { toast("SKU and slug are required", "err"); return; }
    setBusy(true);
    try {
      const url = isNew ? "/api/admin/products" : `/api/admin/products/${product!.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isNew
            ? { name: f.name, sku: f.sku, slug: f.slug, price, regularPrice, stock, image: f.image || null, categorySlugs: f.categorySlugs, brandSlug: f.brandSlug || null, shortDescription: f.shortDescription, description: f.description, featured: f.featured }
            : { name: f.name, price, regularPrice, stock, image: f.image || null, categorySlugs: f.categorySlugs, shortDescription: f.shortDescription, description: f.description, featured: f.featured }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast(isNew ? "Product created" : "Product updated");
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof typeof f, opts?: { money?: boolean; textarea?: boolean }) => (
    <label className="block">
      <span className="text-[12px] font-semibold text-gray-600">{label}</span>
      {opts?.textarea ? (
        <textarea value={String(f[key])} onChange={(e) => set(key, e.target.value)} rows={3} className="mt-1 w-full border rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--em-red)]" />
      ) : (
        <input value={String(f[key])} onChange={(e) => set(key, e.target.value)} inputMode={opts?.money ? "decimal" : undefined} className="mt-1 w-full border rounded px-3 py-2 text-[13px] outline-none focus:border-[var(--em-red)]" />
      )}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg w-full max-w-[620px] p-6 my-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[16px] text-[#232630]">{isNew ? "New product" : `Edit — ${product!.name.slice(0, 40)}…`}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3.5">
          {field("Product name", "name")}
          {isNew && field("SKU", "sku")}
          {isNew && field("Slug", "slug")}
          {field("Price (GH₵)", "priceGhs", { money: true })}
          {field("Regular price (GH₵, optional)", "regularGhs", { money: true })}
          {field("Stock", "stock")}
          {field("Brand slug (optional)", "brandSlug")}
          {field("Image path (e.g. /images/cl/p-gaming-red.png)", "image")}
          <div className="sm:col-span-2">{field("Category slugs (comma separated)", "categorySlugs")}</div>
          <div className="sm:col-span-2">{field("Short description", "shortDescription")}</div>
          <div className="sm:col-span-2">{field("Full description", "description", { textarea: true })}</div>
          <label className="sm:col-span-2 flex items-center gap-2 text-[13px] font-medium text-gray-600">
            <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-[var(--em-red)]" />
            Featured (shows in Best Sellers)
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="border rounded-md px-4 py-2 text-[13px] font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={busy} className="bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white rounded-md px-5 py-2 text-[13px] font-bold disabled:opacity-60 flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Save product
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= orders ================= */
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

function OrdersAdmin() {
  const { toast } = useStore();
  const [rows, setRows] = useState<ORow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async (p: number, st: string) => {
    await Promise.resolve();
    setRows(null);
    try {
      const res = await fetch(`/api/admin/orders?page=${p}&per=${10}&status=${st}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRows(d.rows);
      setTotal(d.total);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => { load(page, status); }, [load, page, status]);

  const pages = Math.max(1, Math.ceil(total / 10));

  const changeStatus = async (o: ORow, s: string) => {
    const res = await fetch(`/api/admin/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (res.ok) { toast(`Order ${o.ref} → ${s}`); load(page, status); }
    else toast("Status update failed", "err");
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {["", ...ORDER_STATUSES].map((s) => (
            <button
              key={s || "all"}
              onClick={() => { setPage(1); setStatus(s); }}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold capitalize ${status === s ? "bg-[var(--em-red)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-gray-400 ml-auto">{total} orders</span>
      </div>

      {!rows ? (
        <SectionLoading />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={status ? `No ${status} orders.` : "No orders yet — place a test order from the storefront."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[680px]">
            <thead className="bg-[#f7f8fb] text-gray-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2.5 rounded-l-md">Ref</th>
                <th className="text-left font-semibold px-3 py-2.5">Customer</th>
                <th className="text-left font-semibold px-3 py-2.5">Payment</th>
                <th className="text-right font-semibold px-3 py-2.5">Total</th>
                <th className="text-center font-semibold px-3 py-2.5">Status</th>
                <th className="text-right font-semibold px-3 py-2.5 rounded-r-md">Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t hover:bg-gray-50/60 align-top">
                  <td className="px-3 py-2.5">
                    <button onClick={() => setOpen(open === o.id ? null : o.id)} className="font-bold text-[var(--em-red)] hover:underline" aria-expanded={open === o.id}>{o.ref}</button>
                    <div className="text-[11px] text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
                    {open === o.id && (
                      <div className="mt-2 border rounded-md p-2.5 bg-[#f8fafc] max-w-[300px]">
                        <div className="text-[12px] space-y-1">
                          <div><b>{o.customerName}</b> — {o.phone}</div>
                          {o.email && <div className="text-gray-500">{o.email}</div>}
                          <div className="text-gray-500">{o.address}, {o.city}, {o.region}</div>
                          <ul className="border-t pt-1.5 mt-1.5 space-y-1">
                            {o.items.map((it) => (
                              <li key={it.id} className="flex justify-between gap-2">
                                <span className="text-gray-600 truncate">{it.name} × {it.qty}</span>
                                <span className="font-semibold whitespace-nowrap">{ghs(it.price * it.qty)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="border-t pt-1.5 mt-1.5 flex justify-between text-gray-500"><span>Shipping</span><span>{o.shipping === 0 ? "Free" : ghs(o.shipping)}</span></div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{o.customerName}<div className="text-[11px] text-gray-400">{o.city}</div></td>
                  <td className="px-3 py-2.5 text-gray-600 text-[12px]">{o.payment}</td>
                  <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">{ghs(o.total)}</td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge status={o.status} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                      className="border rounded-md px-2 py-1.5 text-[12px] font-semibold bg-white capitalize outline-none focus:border-[var(--em-red)]"
                      aria-label={`Update status for ${o.ref}`}
                    >
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span className="text-[12.5px] text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );
}
