"use client";
import { useState } from "react";
import { Activity as ActivityIcon, Boxes, KeyRound, MapPin, Package, ShoppingCart, Users } from "lucide-react";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Spinner, Tabs, fmtDate, timeAgo, useApi, useDebounced, usePage, } from "./ui";

interface Log {
  id: number; action: string; summary: string; actorEmail: string | null; ip: string | null; createdAt: string;
  actor: { name: string | null; image: string | null } | null;
}

const AREA_ICON: Record<string, typeof Package> = { auth: KeyRound, product: Package, stock: Boxes, order: ShoppingCart, staff: Users, location: MapPin };

export function ActivityPage() {
  const [area, setArea] = useState<"" | "auth" | "product" | "stock" | "order" | "staff" | "location">("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = usePage([dq, area].join("|"));
  const per = 30;
  const { data, error, reload } = useApi<{ total: number; rows: Log[] }>(`/api/admin/audit?${new URLSearchParams({ area, q: dq, page: String(page), per: String(per) })}`);

  return (
    <div>
      <PageHeader title="Activity log" subtitle="A record of every sign-in and change made in the dashboard." />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs value={area} onChange={setArea} items={[
            { value: "", label: "All" }, { value: "order", label: "Orders" }, { value: "product", label: "Products" },
            { value: "stock", label: "Stock" }, { value: "location", label: "Locations" }, { value: "staff", label: "Staff" }, { value: "auth", label: "Sign-ins" },
          ]} />
        </div>
        <div className="p-4"><SearchInput value={q} onChange={setQ} placeholder="Search activity or staff email…" /></div>
        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No activity yet" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.rows.map((l) => {
              const Icon = AREA_ICON[l.action.split(".")[0]] || ActivityIcon;
              return (
                <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                  {l.actorEmail ? <Avatar name={l.actor?.name} email={l.actorEmail} image={l.actor?.image} size={32} /> : <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Icon size={15} className="text-slate-400" /></span>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-slate-800"><b className="font-semibold">{l.actor?.name || l.actorEmail || "System"}</b> <span className="text-slate-600">{l.summary}</span></div>
                    <div className="text-[11.5px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                      <span title={fmtDate(l.createdAt)}>{timeAgo(l.createdAt)}</span><span className="font-mono">{l.action}</span>{l.ip && <span>IP {l.ip}</span>}
                    </div>
                  </div>
                  <Icon size={15} className="text-slate-300 mt-1 shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pagination page={page} per={per} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
