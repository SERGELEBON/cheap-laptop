"use client";
import { AlertTriangle, Boxes, Clock, PackageX, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdmin } from "./AdminApp";
import { Card, ErrorState, OrderStatusBadge, PageHeader, Spinner, ghs, fmtNum, timeAgo, useApi, ORDER_STATUS_COLORS, StockBadge, Button } from "./ui";

interface Stats {
  finance: boolean;
  showOrders: boolean;
  kpis: {
    revenueTotal: number | null; revenue30: number | null; avgOrder30: number | null; orders30: number; ordersToday: number;
    pendingOrders: number; productsActive: number; productsTotal: number; unitsInStock: number;
    stockValueRetail: number | null; stockValueCost: number | null; lowStock: number; outOfStock: number;
  };
  byStatus: Record<string, number>;
  daily: { date: string; revenue: number; orders: number }[];
  recentOrders: { id: number; ref: string; customerName: string; total: number; status: string; createdAt: string; location?: { code: string } | null }[];
  topProducts: { name: string; qty: number }[];
  stockAlerts: { id: number; name: string; sku: string; image: string | null; stock: number; threshold: number }[];
}

const tooltipStyle = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(15,23,42,.08)" };

export function Overview() {
  const { me, go, can, activeLocation } = useAdmin();
  const { data, error, loading, reload } = useApi<Stats>(`/api/admin/stats${activeLocation ? `?locationId=${activeLocation}` : ""}`);
  const here = me.locations.find((l) => l.id === activeLocation);
  const hello = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || loading && !data) return <Spinner />;
  const k = data.kpis;

  const kpis = [
    data.finance && { label: "Revenue · 30 days", value: ghs(k.revenue30), sub: `Avg. order ${ghs(k.avgOrder30)}`, icon: TrendingUp, tint: "#1656ce" },
    data.showOrders && { label: "Orders · 30 days", value: fmtNum(k.orders30), sub: `${k.ordersToday} today`, icon: ShoppingCart, tint: "#7c3aed" },
    data.showOrders && { label: "To fulfil", value: fmtNum(k.pendingOrders), sub: "pending + processing", icon: Clock, tint: "#d97706", onClick: () => go("orders") },
    { label: "Units in stock", value: fmtNum(k.unitsInStock), sub: `${k.productsActive} active products`, icon: Boxes, tint: "#0891b2" },
    data.finance && { label: "Stock value (retail)", value: ghs(k.stockValueRetail), sub: k.stockValueCost ? `Cost ${ghs(k.stockValueCost)}` : "Add cost prices for margin", icon: Wallet, tint: "#16a34a" },
    { label: "Stock alerts", value: `${k.outOfStock + k.lowStock}`, sub: `${k.outOfStock} out · ${k.lowStock} low`, icon: k.outOfStock ? PackageX : AlertTriangle, tint: "#dc2626", onClick: can("stock:read") ? () => go("inventory") : undefined },
  ].filter(Boolean) as { label: string; value: string; sub: string; icon: typeof Boxes; tint: string; onClick?: () => void }[];

  const statusTotal = Object.values(data.byStatus).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title={`${hello}, ${me.user.name?.split(" ")[0] || "there"}`} subtitle={here ? `Here's what's happening at ${here.name}.` : me.locations.length > 1 ? `All ${me.locations.length} locations combined — pick a shop at the top to focus on it.` : "Here's what's happening in your store."} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3 mb-5">
        {kpis.map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            disabled={!c.onClick}
            className="text-left bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] enabled:hover:border-slate-300 enabled:hover:shadow-md transition disabled:cursor-default"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12px] font-medium text-slate-500">{c.label}</span>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.tint}14`, color: c.tint }}><c.icon size={16} /></span>
            </div>
            <div className="text-[21px] font-extrabold text-slate-900 mt-1.5 whitespace-nowrap">{c.value}</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mb-4">
        <Card title={data.finance ? "Revenue — last 30 days" : "Orders — last 30 days"} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1656ce" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1656ce" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={56} allowDecimals={false}
                tickFormatter={(v) => (data.finance ? (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)) : String(v))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => (data.finance ? [ghs(Number(v) * 100), "Revenue"] : [String(v), "Orders"])} />
              <Area type="monotone" dataKey={data.finance ? "revenue" : "orders"} stroke="#1656ce" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {data.showOrders ? (
          <Card title="Orders by status">
            {statusTotal === 0 ? (
              <p className="text-[13px] text-slate-400 py-20 text-center">No orders yet.</p>
            ) : (
              <ul className="space-y-3 pt-1">
                {Object.entries(ORDER_STATUS_COLORS).map(([s, color]) => {
                  const n = data.byStatus[s] || 0;
                  return (
                    <li key={s}>
                      <div className="flex justify-between text-[12.5px] mb-1"><span className="capitalize text-slate-600">{s}</span><span className="font-semibold">{n}</span></div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(n / statusTotal) * 100}%`, background: color }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : (
          <Card title="Best sellers (units)"><TopProducts data={data.topProducts} /></Card>
        )}
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        {data.showOrders && (
          <Card title="Recent orders" className="xl:col-span-2" padded={false} actions={<Button size="sm" variant="ghost" onClick={() => go("orders")}>View all</Button>}>
            {data.recentOrders.length === 0 ? (
              <p className="text-[13px] text-slate-400 py-14 text-center">Orders will appear here after the first checkout.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-800">{o.ref} <span className="font-normal text-slate-500">· {o.customerName}</span></div>
                      <div className="text-[11.5px] text-slate-400">{timeAgo(o.createdAt)}{o.location ? ` · ${o.location.code}` : ""}</div>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <div className="text-[13px] font-bold w-[110px] text-right">{ghs(o.total)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card title="Stock alerts" padded={false} actions={can("stock:read") && <Button size="sm" variant="ghost" onClick={() => go("inventory")}>Manage stock</Button>}>
          {data.stockAlerts.length === 0 ? (
            <p className="text-[13px] text-slate-400 py-14 text-center">All products are well stocked. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.stockAlerts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image && <img src={p.image} alt="" className="max-w-full max-h-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-slate-800 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.sku}</div>
                  </div>
                  <StockBadge stock={p.stock} threshold={p.threshold} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.showOrders && (
          <Card title="Best sellers (units)" className="xl:col-span-3"><TopProducts data={data.topProducts} /></Card>
        )}
      </div>
    </div>
  );
}

function TopProducts({ data }: { data: { name: string; qty: number }[] }) {
  if (data.length === 0) return <p className="text-[13px] text-slate-400 py-14 text-center">No sales yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 11.5, fill: "#334155" }} tickLine={false} axisLine={false}
          tickFormatter={(v: string) => (v.length > 34 ? v.slice(0, 33) + "…" : v)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Units sold"]} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="qty" fill="#1656ce" radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
