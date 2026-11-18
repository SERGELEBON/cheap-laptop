"use client";
import { useState } from "react";
import { MapPin, Phone, Mail, ShoppingCart, StickyNote } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, OrderStatusBadge, PageHeader, Pagination, SearchInput, Spinner,
  Tabs, api, cx, fmtDate, ghs, td, th, useApi, useDebounced, usePage, ORDER_STATUS_COLORS,
} from "./ui";
import { ORDER_STATUSES, ORDER_TRANSITIONS, type OrderStatus } from "@/lib/rbac";

interface ORow {
  id: number; ref: string; customerName: string; phone: string; email: string | null; address: string; city: string; region: string;
  notes: string | null; payment: string; subtotal: number; shipping: number; total: number; status: OrderStatus; createdAt: string;
  items: { id: number; name: string; qty: number; price: number; productId: number | null }[];
}

const ACTION_LABEL: Record<OrderStatus, string> = {
  pending: "Mark pending", processing: "Start processing", shipped: "Mark as shipped", delivered: "Mark as delivered", cancelled: "Cancel order",
};

export function OrdersPage() {
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = usePage([dq, status].join("|"));
  const per = 15;
  const { data, error, loading, reload } = useApi<{ total: number; rows: ORow[]; byStatus: Record<string, number> }>(
    `/api/admin/orders?${new URLSearchParams({ q: dq, status, page: String(page), per: String(per) })}`
  );
  const [open, setOpen] = useState<ORow | null>(null);
  const all = data ? Object.values(data.byStatus).reduce((a, b) => a + b, 0) : undefined;

  return (
    <div>
      <PageHeader title="Orders" subtitle="Process customer orders from payment to delivery." />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs value={status} onChange={setStatus} items={[{ value: "", label: "All", count: all }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: data?.byStatus[s] ?? 0 }))]} />
        </div>
        <div className="p-4"><SearchInput value={q} onChange={setQ} placeholder="Search ref, customer or phone…" /></div>
        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders" text={q || status ? "Try changing the filters." : "Orders placed on the store will appear here."} />
        ) : (
          <div className={cx("overflow-x-auto", loading && "opacity-60")}>
            <table className="w-full text-[13px] min-w-[760px]">
              <thead><tr>
                <th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Items</th><th className={th}>Payment</th>
                <th className={cx(th, "text-right")}>Total</th><th className={th}>Status</th>
              </tr></thead>
              <tbody>
                {data.rows.map((o) => (
                  <tr key={o.id} onClick={() => setOpen(o)} className="hover:bg-slate-50/70 cursor-pointer">
                    <td className={td}><div className="font-bold text-[var(--em-red)]">{o.ref}</div><div className="text-[11.5px] text-slate-400">{fmtDate(o.createdAt)}</div></td>
                    <td className={td}><div className="font-medium text-slate-800">{o.customerName}</div><div className="text-[11.5px] text-slate-400">{o.phone} · {o.city}</div></td>
                    <td className={cx(td, "text-slate-500")}>{o.items.reduce((a, i) => a + i.qty, 0)} item(s)</td>
                    <td className={cx(td, "text-slate-500 text-[12px]")}>{o.payment}</td>
                    <td className={cx(td, "text-right font-bold whitespace-nowrap")}>{ghs(o.total)}</td>
                    <td className={td}><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} per={per} total={data.total} onPage={setPage} />}
      </Card>
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} onChanged={(o) => { setOpen(o); reload(); }} />}
    </div>
  );
}

function OrderDrawer({ order, onClose, onChanged }: { order: ORow; onClose: () => void; onChanged: (o: ORow) => void }) {
  const { can, toast } = useAdmin();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = ORDER_TRANSITIONS[order.status];

  const move = async (s: OrderStatus) => {
    setBusy(s);
    try {
      await api(`/api/admin/orders/${order.id}`, { method: "PATCH", json: { status: s } });
      toast(`${order.ref} → ${s}${s === "cancelled" ? " (stock restored)" : ""}`);
      onChanged({ ...order, status: s });
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  const steps: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];
  const idx = steps.indexOf(order.status);

  return (
    <Modal wide title={`Order ${order.ref}`} onClose={onClose}
      footer={can("orders:update") && next.length > 0 ? (
        <>
          {next.includes("cancelled") && <Button variant="ghost" className="!text-red-600 mr-auto" onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
          {next.filter((s) => s !== "cancelled").map((s) => <Button key={s} variant="primary" loading={busy === s} onClick={() => move(s)}>{ACTION_LABEL[s]}</Button>)}
        </>
      ) : undefined}
    >
      {order.status === "cancelled" ? (
        <div className="mb-5"><OrderStatusBadge status="cancelled" /></div>
      ) : (
        <ol className="flex items-center mb-6">
          {steps.map((s, i) => (
            <li key={s} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: i <= idx ? ORDER_STATUS_COLORS[s] : "#cbd5e1" }}>{i + 1}</span>
                <span className={cx("text-[11px] capitalize", i <= idx ? "text-slate-800 font-semibold" : "text-slate-400")}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-0.5 mx-2 -mt-4" style={{ background: i < idx ? "#1656ce" : "#e2e8f0" }} />}
            </li>
          ))}
        </ol>
      )}
      <div className="grid md:grid-cols-[1fr_250px] gap-5">
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-2">Items</h4>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                <span className="text-slate-700">{it.name} <span className="text-slate-400">× {it.qty}</span></span>
                <span className="font-semibold whitespace-nowrap">{ghs(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 text-[13px] space-y-1.5">
            <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd>{ghs(order.subtotal)}</dd></div>
            <div className="flex justify-between text-slate-500"><dt>Delivery</dt><dd>{order.shipping === 0 ? "Free" : ghs(order.shipping)}</dd></div>
            <div className="flex justify-between font-extrabold text-[15px] pt-1.5 border-t border-slate-100"><dt>Total</dt><dd>{ghs(order.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-3 text-[13px]">
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Customer</h4>
          <div className="font-semibold text-slate-800">{order.customerName}</div>
          <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-[var(--em-red)]"><Phone size={14} /> {order.phone}</a>
          <a href={`https://wa.me/233${order.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="block text-[12px] text-green-700 underline">WhatsApp the customer</a>
          {order.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14} /> {order.email}</div>}
          <div className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0" /> {order.address}, {order.city}, {order.region}</div>
          {order.notes && <div className="flex items-start gap-2 text-slate-600 bg-amber-50 rounded-lg p-2.5"><StickyNote size={14} className="mt-0.5 shrink-0" /> {order.notes}</div>}
          <div className="text-slate-500 pt-2 border-t border-slate-100">Payment: <b className="text-slate-700">{order.payment}</b><br />Placed {fmtDate(order.createdAt)}</div>
        </div>
      </div>
      {confirmCancel && (
        <ConfirmDialog title={`Cancel ${order.ref}?`} danger confirmLabel="Cancel order" onClose={() => setConfirmCancel(false)} onConfirm={() => move("cancelled")}
          message="The order will be cancelled and its items returned to stock. This can't be undone." />
      )}
    </Modal>
  );
}
