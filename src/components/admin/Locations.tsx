"use client";
import { useState } from "react";
import { AlertTriangle, Boxes, MapPin, Pencil, Phone, Plus, Power, Star, Trash2, Users } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Spinner, api, cx, fmtNum, useApi,
} from "./ui";

export interface LocationRow {
  id: number; name: string; code: string; city: string; address: string; phone: string; regions: string[];
  isMain: boolean; active: boolean; sortOrder: number; staffCount: number; orderCount: number; units: number; low: number; out: number;
}

export function LocationsPage() {
  const { toast, setActiveLocation, go } = useAdmin();
  const { data, error, reload } = useApi<{ rows: LocationRow[]; regions: string[] }>("/api/admin/locations");
  const [editing, setEditing] = useState<LocationRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<LocationRow | null>(null);

  const toggle = async (l: LocationRow) => {
    try {
      await api(`/api/admin/locations/${l.id}`, { method: "PUT", json: { active: !l.active } });
      toast(l.active ? `${l.name} deactivated` : `${l.name} reactivated`);
      reload();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Your shops and warehouses. Each one has its own stock, staff and online orders for the regions it serves."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add location</Button>}
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations yet" action={<Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add location</Button>} />
      ) : (
        <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {data.rows.map((l) => (
            <section key={l.id} className={cx("bg-white border rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", l.active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[16px] font-extrabold text-slate-900">{l.name}</h3>
                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{l.code}</span>
                    {l.isMain && <Badge color="#1656ce"><Star size={11} className="inline -mt-0.5" /> Main</Badge>}
                    {!l.active && <Badge color="#64748b">Inactive</Badge>}
                  </div>
                  <div className="text-[12.5px] text-slate-500 mt-1 flex items-center gap-1"><MapPin size={13} /> {[l.address, l.city].filter(Boolean).join(", ")}</div>
                  {l.phone && <div className="text-[12.5px] text-slate-500 flex items-center gap-1"><Phone size={13} /> {l.phone}</div>}
                </div>
                <div className="flex shrink-0">
                  <button onClick={() => setEditing(l)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[var(--em-red)]" aria-label={`Edit ${l.name}`}><Pencil size={15} /></button>
                  {!l.isMain && <button onClick={() => toggle(l)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={l.active ? `Deactivate ${l.name}` : `Reactivate ${l.name}`} title={l.active ? "Deactivate" : "Reactivate"}><Power size={15} /></button>}
                  {!l.isMain && <button onClick={() => setDeleting(l)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${l.name}`}><Trash2 size={15} /></button>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <Stat icon={Boxes} label="Units" value={fmtNum(l.units)} />
                <Stat icon={AlertTriangle} label="Alerts" value={`${l.out + l.low}`} tone={l.out + l.low > 0 ? "warn" : undefined} />
                <Stat icon={Users} label="Staff" value={String(l.staffCount)} />
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Online orders from</div>
                <div className="flex flex-wrap gap-1">
                  {l.regions.length ? l.regions.map((r) => <span key={r} className="text-[11.5px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{r}</span>)
                    : <span className="text-[12px] text-slate-400">{l.isMain ? "All regions not covered by another shop" : "No region — in-store sales only"}</span>}
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button size="sm" onClick={() => { setActiveLocation(l.id); go("inventory"); }}>View stock</Button>
                <Button size="sm" variant="ghost" onClick={() => { setActiveLocation(l.id); go("orders"); }}>Orders ({l.orderCount})</Button>
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && data && (
        <LocationForm loc={editing === "new" ? null : editing} regions={data.regions} taken={data.rows}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
      {deleting && (
        <ConfirmDialog title={`Delete ${deleting.name}?`} danger confirmLabel="Delete" onClose={() => setDeleting(null)}
          message="Only an empty location (no stock, no orders) can be deleted. Otherwise transfer its stock and deactivate it — its history stays intact."
          onConfirm={async () => {
            try { await api(`/api/admin/locations/${deleting.id}`, { method: "DELETE" }); toast("Location deleted"); reload(); }
            catch (e) { toast((e as Error).message, "err"); }
            setDeleting(null);
          }} />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone?: "warn" }) {
  return (
    <div className={cx("rounded-lg px-3 py-2", tone === "warn" ? "bg-amber-50" : "bg-slate-50")}>
      <div className="text-[11px] text-slate-500 flex items-center gap-1"><Icon size={12} /> {label}</div>
      <div className={cx("text-[16px] font-extrabold", tone === "warn" ? "text-amber-700" : "text-slate-900")}>{value}</div>
    </div>
  );
}

function LocationForm({ loc, regions, taken, onClose, onSaved }: { loc: LocationRow | null; regions: string[]; taken: LocationRow[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useAdmin();
  const [f, setF] = useState({
    name: loc?.name ?? "", code: loc?.code ?? "", city: loc?.city ?? "", address: loc?.address ?? "", phone: loc?.phone ?? "",
    regions: loc?.regions ?? [], isMain: loc?.isMain ?? false, sortOrder: String(loc?.sortOrder ?? taken.length + 1),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  /* region already served by another shop → shown so you don't double-assign */
  const owner = (r: string) => taken.find((t) => t.id !== loc?.id && t.active && t.regions.includes(r));

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      const body = { ...f, code: f.code.toUpperCase(), sortOrder: parseInt(f.sortOrder, 10) || 0 };
      await api(loc ? `/api/admin/locations/${loc.id}` : "/api/admin/locations", { method: loc ? "PUT" : "POST", json: body });
      toast(loc ? "Location saved" : "Location created");
      onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal wide title={loc ? `Edit ${loc.name}` : "Add a location"} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{loc ? "Save" : "Create location"}</Button></>}>
      {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4" role="alert">{err}</div>}
      <div className="grid sm:grid-cols-[1fr_110px] gap-3.5">
        <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Accra — Circle" autoFocus /></Field>
        <Field label="Code" hint="Short label"><Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().slice(0, 6))} placeholder="ACC" className="font-mono" /></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-3.5 mt-3.5">
        <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0240 999979" /></Field>
        <Field label="Display order"><Input type="number" min={0} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
      </div>
      <Field label="Address" className="mt-3.5"><Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, landmark" /></Field>

      <div className="mt-5">
        <div className="text-[12.5px] font-semibold text-slate-700">Regions served for online orders</div>
        <p className="text-[11.5px] text-slate-400 mb-2">Orders from these regions are prepared by this shop (and its stock is used first).</p>
        <div className="flex flex-wrap gap-1.5">
          {regions.map((r) => {
            const on = f.regions.includes(r);
            const other = owner(r);
            return (
              <button type="button" key={r} onClick={() => set("regions", on ? f.regions.filter((x) => x !== r) : [...f.regions, r])}
                title={other && !on ? `Currently served by ${other.name}` : undefined}
                className={cx("px-2.5 py-1 rounded-full border text-[12px] font-medium transition-colors",
                  on ? "bg-[var(--em-red)] border-[var(--em-red)] text-white" : other ? "border-dashed border-slate-300 text-slate-400" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                {r}{other && !on ? ` · ${other.code}` : ""}
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex items-start gap-2.5 mt-5 text-[13px] text-slate-700">
        <input type="checkbox" checked={f.isMain} disabled={loc?.isMain} onChange={(e) => set("isMain", e.target.checked)} className="accent-[var(--em-red)] w-4 h-4 mt-0.5" />
        <span><b>Main shop</b> — receives online orders from regions no other shop covers, and new products' opening stock.</span>
      </label>
    </Modal>
  );
}
