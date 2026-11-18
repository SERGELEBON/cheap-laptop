"use client";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Boxes, Equal, History, PackagePlus } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner,
  StockBadge, Tabs, api, cx, fmtDate, fmtNum, td, th, useApi, useDebounced, usePage,
} from "./ui";
import { STOCK_ADJUST_TYPES, STOCK_TYPE_INFO, type StockAdjustType } from "@/lib/rbac";
import { Thumb, type PRow } from "./Products";

interface Movement {
  id: number; type: string; quantity: number; stockBefore: number; stockAfter: number; note: string | null; createdAt: string; orderId: number | null;
  product: { id: number; name: string; sku: string; image: string | null };
  actor: { email: string; name: string | null } | null;
}

export function InventoryPage() {
  const [tab, setTab] = useState<"levels" | "movements">("levels");
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock on hand, alerts and a full history of every stock movement." />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs value={tab} onChange={setTab} items={[{ value: "levels", label: "Stock levels" }, { value: "movements", label: "Movement history" }]} />
        </div>
        {tab === "levels" ? <StockLevels /> : <Movements />}
      </Card>
    </div>
  );
}

function StockLevels() {
  const { can } = useAdmin();
  const [q, setQ] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("stock_asc");
  const dq = useDebounced(q);
  const [page, setPage] = usePage([dq, stock, sort].join("|"));
  const per = 25;
  const { data, error, loading, reload } = useApi<{ total: number; rows: PRow[] }>(
    `/api/admin/products?${new URLSearchParams({ q: dq, stock, sort, page: String(page), per: String(per), status: "" })}`
  );
  const [adjust, setAdjust] = useState<{ p: PRow; type?: StockAdjustType } | null>(null);
  const [history, setHistory] = useState<PRow | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search product or SKU…" />
        <div className="flex gap-1">
          {[["", "All"], ["low", "Low stock"], ["out", "Out of stock"]].map(([v, l]) => (
            <button key={v} onClick={() => setStock(v)} className={cx("px-3 py-1.5 rounded-full text-[12.5px] font-semibold", stock === v ? "bg-[var(--em-red)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{l}</button>
          ))}
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-auto ml-auto" aria-label="Sort">
          <option value="stock_asc">Lowest stock first</option><option value="stock_desc">Highest stock first</option><option value="name">Name A–Z</option>
        </Select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
        <EmptyState icon={Boxes} title={stock ? "Nothing to report here" : "No products"} text={stock === "low" ? "No product is below its alert level." : stock === "out" ? "Every product is in stock." : undefined} />
      ) : (
        <div className={cx("overflow-x-auto", loading && "opacity-60")}>
          <table className="w-full text-[13px] min-w-[760px]">
            <thead><tr>
              <th className={th}>Product</th><th className={cx(th, "text-right")}>On hand</th><th className={cx(th, "text-right")}>Alert at</th>
              <th className={th}>Status</th><th className={cx(th, "text-right")}>Actions</th>
            </tr></thead>
            <tbody>
              {data.rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className={td}>
                    <div className="flex items-center gap-3"><Thumb src={p.image} size={36} />
                      <div className="min-w-0"><div className="font-semibold text-slate-800 line-clamp-1 max-w-[340px]">{p.name}</div><div className="text-[11.5px] text-slate-400">{p.sku}{p.status !== "ACTIVE" && ` · ${p.status.toLowerCase()}`}</div></div>
                    </div>
                  </td>
                  <td className={cx(td, "text-right text-[15px] font-extrabold", p.stock <= 0 ? "text-red-600" : p.stock <= p.lowStockThreshold ? "text-amber-600" : "text-slate-800")}>{fmtNum(p.stock)}</td>
                  <td className={cx(td, "text-right text-slate-500")}>{p.lowStockThreshold}</td>
                  <td className={td}><StockBadge stock={p.stock} threshold={p.lowStockThreshold} /></td>
                  <td className={cx(td, "text-right whitespace-nowrap")}>
                    <Button size="sm" variant="ghost" icon={History} onClick={() => setHistory(p)}>History</Button>
                    {can("stock:adjust") && <>
                      <Button size="sm" icon={PackagePlus} onClick={() => setAdjust({ p, type: "RESTOCK" })} className="ml-1">Restock</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdjust({ p })} className="ml-1">Adjust</Button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} per={per} total={data.total} onPage={setPage} />}
      {adjust && <StockAdjustModal product={adjust.p} initialType={adjust.type} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); reload(); }} />}
      {history && (
        <Modal wide title={`Stock history — ${history.name.slice(0, 50)}`} onClose={() => setHistory(null)}>
          <div className="-mx-5 -my-4"><Movements productId={history.id} compact /></div>
        </Modal>
      )}
    </>
  );
}

function Movements({ productId, compact }: { productId?: number; compact?: boolean }) {
  const [type, setType] = useState("");
  const [page, setPage] = usePage(type);
  const per = compact ? 10 : 25;
  const { data, error, reload } = useApi<{ total: number; rows: Movement[] }>(
    `/api/admin/stock/movements?${new URLSearchParams({ type, page: String(page), per: String(per), ...(productId ? { productId: String(productId) } : {}) })}`
  );

  return (
    <>
      <div className="flex flex-wrap gap-2 p-4">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="!w-auto" aria-label="Movement type">
          <option value="">All movements</option>
          {Object.entries(STOCK_TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
        <EmptyState icon={History} title="No stock movements yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead><tr>
              <th className={th}>Date</th>{!productId && <th className={th}>Product</th>}<th className={th}>Movement</th>
              <th className={cx(th, "text-right")}>Change</th><th className={cx(th, "text-right")}>Stock</th><th className={th}>By / note</th>
            </tr></thead>
            <tbody>
              {data.rows.map((m) => {
                const info = STOCK_TYPE_INFO[m.type];
                const Icon = m.quantity > 0 ? ArrowUpRight : m.quantity < 0 ? ArrowDownRight : Equal;
                return (
                  <tr key={m.id}>
                    <td className={cx(td, "text-slate-500 whitespace-nowrap text-[12px]")}>{fmtDate(m.createdAt)}</td>
                    {!productId && <td className={td}><div className="line-clamp-1 max-w-[240px] font-medium">{m.product.name}</div><div className="text-[11px] text-slate-400">{m.product.sku}</div></td>}
                    <td className={td}><Badge color={m.quantity > 0 ? "#16a34a" : m.quantity < 0 ? "#dc2626" : "#64748b"}>{info?.label || m.type}</Badge></td>
                    <td className={cx(td, "text-right font-bold whitespace-nowrap", m.quantity > 0 ? "text-green-600" : m.quantity < 0 ? "text-red-600" : "text-slate-500")}>
                      <Icon size={13} className="inline -mt-0.5" /> {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className={cx(td, "text-right text-slate-600 whitespace-nowrap")}>{m.stockBefore} → <b className="text-slate-900">{m.stockAfter}</b></td>
                    <td className={cx(td, "text-[12px] text-slate-500 max-w-[220px]")}>
                      <div className="truncate">{m.actor ? m.actor.name || m.actor.email : m.type === "SALE" ? "Online order" : "System"}</div>
                      {m.note && <div className="truncate text-slate-400">{m.note}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} per={per} total={data.total} onPage={setPage} />}
    </>
  );
}

/* ================= adjust dialog ================= */
export function StockAdjustModal({ product, initialType, onClose, onDone }: { product: Pick<PRow, "id" | "name" | "sku" | "stock" | "image">; initialType?: StockAdjustType; onClose: () => void; onDone: () => void }) {
  const { toast } = useAdmin();
  const [type, setType] = useState<StockAdjustType>(initialType || "RESTOCK");
  const [qty, setQty] = useState(type === "COUNT" ? String(product.stock) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const n = Math.max(0, parseInt(qty, 10) || 0);
  const sign = STOCK_TYPE_INFO[type].sign;
  const after = sign === "=" ? n : sign === "+" ? product.stock + n : product.stock - n;
  const needsNote = ["DAMAGE", "LOSS", "COUNT"].includes(type);

  const submit = async () => {
    setErr(null);
    if (type !== "COUNT" && n <= 0) return setErr("Enter a quantity of at least 1.");
    if (after < 0) return setErr(`You can't remove more than the ${product.stock} units in stock.`);
    if (needsNote && note.trim().length < 3) return setErr("Please give a short reason.");
    setBusy(true);
    try {
      await api(`/api/admin/stock/${product.id}`, { method: "POST", json: { type, quantity: n, note: note.trim() || undefined } });
      toast(`Stock updated: ${product.stock} → ${after}`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Adjust stock" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Confirm</Button></>}>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
        <Thumb src={product.image} size={44} />
        <div className="min-w-0"><div className="font-semibold text-[13px] line-clamp-1">{product.name}</div><div className="text-[12px] text-slate-500">{product.sku} · {product.stock} in stock</div></div>
      </div>
      {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3" role="alert">{err}</div>}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {STOCK_ADJUST_TYPES.map((t) => (
          <button key={t} onClick={() => { setType(t); if (t === "COUNT") setQty(String(product.stock)); }}
            className={cx("text-left border rounded-lg px-3 py-2 text-[12.5px] transition-colors", type === t ? "border-[var(--em-red)] bg-[var(--em-red)]/5 text-[var(--em-red)] font-semibold" : "border-slate-200 hover:border-slate-300 text-slate-600")}>
            <span className="font-mono mr-1.5">{STOCK_TYPE_INFO[t].sign}</span>{STOCK_TYPE_INFO[t].label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label={type === "COUNT" ? "Counted quantity" : "Quantity"}>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <div className="text-[13px] pb-2.5 text-slate-500">New stock: <b className={cx("text-[16px]", after < 0 ? "text-red-600" : "text-slate-900")}>{after}</b></div>
      </div>
      <Field label={needsNote ? "Reason (required)" : "Note (optional)"} className="mt-3">
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={type === "RESTOCK" ? "Supplier, invoice no.…" : "What happened?"} />
      </Field>
    </Modal>
  );
}
