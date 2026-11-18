"use client";
import { useEffect, useMemo, useState } from "react";
import { Archive, Boxes, Copy, ImageOff, Package, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useAdmin } from "./AdminApp";
import {
  Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Pagination, ProductStatusBadge,
  SearchInput, Select, Spinner, StockBadge, Tabs, Textarea, api, cx, fromPesewas, ghs, td, th, toPesewas, useApi, useDebounced, usePage,
} from "./ui";
import { StockAdjustModal } from "./Inventory";

export interface PRow {
  id: number; slug: string; name: string; sku: string; status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  price: number; regularPrice: number | null; costPrice?: number | null; discount: number; onSale: boolean;
  image: string | null; categorySlugs: string[]; brandSlug: string | null; shortDescription: string; description: string;
  stock: number; lowStockThreshold: number; featured: boolean; updatedAt: string; stockState: "in" | "low" | "out";
}

interface Taxonomy { categories: { slug: string; name: string; parent: number; id: number }[]; brands: { slug: string; name: string }[] }
let taxonomyCache: Taxonomy | null = null;
export function useTaxonomy(): Taxonomy {
  const [t, setT] = useState<Taxonomy>(taxonomyCache || { categories: [], brands: [] });
  useEffect(() => {
    if (taxonomyCache) return;
    fetch("/data/catalog.json")
      .then((r) => r.json())
      .then((d: Taxonomy) => { taxonomyCache = { categories: d.categories, brands: d.brands }; setT(taxonomyCache); })
      .catch(() => {});
  }, []);
  return t;
}

type StatusTab = "" | "ACTIVE" | "DRAFT" | "ARCHIVED";

export function ProductsPage() {
  const { can, toast } = useAdmin();
  const tax = useTaxonomy();
  const [status, setStatus] = useState<StatusTab>("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("newest");
  const dq = useDebounced(q);
  const [page, setPage] = usePage([dq, status, category, stock, sort].join("|"));
  const per = 20;

  const url = `/api/admin/products?${new URLSearchParams({ q: dq, status, category, stock, sort, page: String(page), per: String(per) })}`;
  const { data, error, loading, reload } = useApi<{ total: number; rows: PRow[] }>(url);

  const [editing, setEditing] = useState<PRow | "new" | null>(null);
  const [duplicate, setDuplicate] = useState<PRow | null>(null);
  const [adjusting, setAdjusting] = useState<PRow | null>(null);
  const [deleting, setDeleting] = useState<PRow | null>(null);

  const setProductStatus = async (p: PRow, s: PRow["status"]) => {
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PUT", json: { status: s } });
      toast(s === "ARCHIVED" ? "Product archived — hidden from the store" : s === "ACTIVE" ? "Product published" : "Moved to drafts");
      reload();
    } catch (e) { toast((e as Error).message, "err"); }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalogue: details, prices, visibility."
        actions={can("products:create") && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add product</Button>}
      />
      <Card padded={false}>
        <div className="px-4 pt-2">
          <Tabs value={status} onChange={setStatus} items={[
            { value: "", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "DRAFT", label: "Drafts" }, { value: "ARCHIVED", label: "Archived" },
          ]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, SKU or brand…" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto" aria-label="Category">
            <option value="">All categories</option>
            {tax.categories.map((c) => <option key={c.slug} value={c.slug}>{c.parent ? "— " : ""}{c.name}</option>)}
          </Select>
          <Select value={stock} onChange={(e) => setStock(e.target.value)} className="!w-auto" aria-label="Stock">
            <option value="">Any stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-auto ml-auto" aria-label="Sort">
            <option value="newest">Newest</option><option value="name">Name A–Z</option>
            <option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option>
            <option value="stock_asc">Stock ↑</option><option value="stock_desc">Stock ↓</option>
          </Select>
        </div>

        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <Spinner /> : data.rows.length === 0 ? (
          <EmptyState icon={Package} title="No products found" text={q || category || stock || status ? "Try changing your filters." : "Add your first product to start selling."}
            action={can("products:create") && !q && <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>Add product</Button>} />
        ) : (
          <div className={cx("overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="w-full text-[13px] min-w-[860px]">
              <thead><tr>
                <th className={th}>Product</th><th className={th}>Status</th><th className={cx(th, "text-right")}>Price</th>
                <th className={th}>Stock</th><th className={th}>Category</th><th className={cx(th, "text-right")}>Actions</th>
              </tr></thead>
              <tbody>
                {data.rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.image} />
                        <div className="min-w-0">
                          <button onClick={() => can("products:update") && setEditing(p)} className="font-semibold text-slate-800 hover:text-[var(--em-red)] text-left line-clamp-1 max-w-[320px]">{p.name}</button>
                          <div className="text-[11.5px] text-slate-400 flex items-center gap-1.5">{p.sku}{p.featured && <span className="inline-flex items-center gap-0.5 text-amber-600"><Star size={11} fill="currentColor" /> Featured</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}><ProductStatusBadge status={p.status} /></td>
                    <td className={cx(td, "text-right whitespace-nowrap")}>
                      <div className="font-bold">{ghs(p.price)}</div>
                      {p.onSale && <div className="text-[11px] text-slate-400"><s>{ghs(p.regularPrice)}</s> <span className="text-[var(--em-red)] font-semibold">-{p.discount}%</span></div>}
                    </td>
                    <td className={td}><StockBadge stock={p.stock} threshold={p.lowStockThreshold} /></td>
                    <td className={cx(td, "text-slate-500 text-[12px] max-w-[160px] truncate")}>{p.categorySlugs.map((s) => tax.categories.find((c) => c.slug === s)?.name || s).join(", ") || "—"}</td>
                    <td className={cx(td, "text-right whitespace-nowrap")}>
                      {can("stock:adjust") && <IconBtn label="Adjust stock" onClick={() => setAdjusting(p)}><Boxes size={15} /></IconBtn>}
                      {can("products:update") && <IconBtn label="Edit" onClick={() => setEditing(p)}><Pencil size={15} /></IconBtn>}
                      {can("products:create") && <IconBtn label="Duplicate" onClick={() => setDuplicate(p)}><Copy size={15} /></IconBtn>}
                      {can("products:update") && p.status !== "ARCHIVED" && <IconBtn label="Archive" onClick={() => setProductStatus(p, "ARCHIVED")}><Archive size={15} /></IconBtn>}
                      {can("products:delete") && <IconBtn label="Delete" danger onClick={() => setDeleting(p)}><Trash2 size={15} /></IconBtn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} per={per} total={data.total} onPage={setPage} />}
      </Card>

      {(editing || duplicate) && (
        <ProductForm
          product={editing && editing !== "new" ? editing : null}
          template={duplicate}
          onClose={() => { setEditing(null); setDuplicate(null); }}
          onSaved={() => { setEditing(null); setDuplicate(null); reload(); }}
        />
      )}
      {adjusting && <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); reload(); }} />}
      {deleting && (
        <ConfirmDialog
          title="Delete product?"
          danger
          confirmLabel="Delete permanently"
          message={<>“{deleting.name}” will be permanently removed. Products that have already been ordered can't be deleted — archive them instead to keep your order history intact.</>}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await api(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
              toast("Product deleted");
              setDeleting(null);
              reload();
            } catch (e) { toast((e as Error).message, "err"); setDeleting(null); }
          }}
        />
      )}
    </div>
  );
}

export function Thumb({ src, size = 40 }: { src: string | null; size?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="max-w-full max-h-full object-contain" /> : <ImageOff size={16} className="text-slate-300" />}
    </div>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={cx("p-2 rounded-lg text-slate-500 transition-colors", danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-[var(--em-red)]")}>
      {children}
    </button>
  );
}

/* ================= create / edit form ================= */
function ProductForm({ product, template, onClose, onSaved }: { product: PRow | null; template: PRow | null; onClose: () => void; onSaved: () => void }) {
  const { can, toast } = useAdmin();
  const tax = useTaxonomy();
  const isNew = !product;
  const src = product || template;
  const [f, setF] = useState({
    name: template ? `${template.name} (copy)` : src?.name || "",
    sku: product?.sku || "",
    slug: product?.slug || "",
    status: (src?.status === "ARCHIVED" && !product ? "DRAFT" : src?.status) || "ACTIVE",
    price: fromPesewas(src?.price),
    regularPrice: fromPesewas(src?.regularPrice),
    costPrice: fromPesewas(src?.costPrice),
    stock: "0",
    lowStockThreshold: String(src?.lowStockThreshold ?? 3),
    image: src?.image || "",
    categorySlugs: src?.categorySlugs || [],
    brandSlug: src?.brandSlug || "",
    shortDescription: src?.shortDescription || "",
    description: src?.description || "",
    featured: src?.featured || false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const price = toPesewas(f.price);
  const regular = f.regularPrice ? toPesewas(f.regularPrice) : null;
  const cost = f.costPrice ? toPesewas(f.costPrice) : null;
  const discount = regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0;
  const margin = cost && price ? Math.round(((price - cost) / price) * 100) : null;

  const topCats = useMemo(() => tax.categories.filter((c) => !c.parent), [tax.categories]);
  const subCats = (id: number) => tax.categories.filter((c) => c.parent === id);

  const save = async () => {
    setErr(null);
    if (f.name.trim().length < 3) return setErr("Enter a product name (3+ characters).");
    if (price <= 0) return setErr("Enter a valid price.");
    if (regular != null && regular < price) return setErr("Regular price must be higher than or equal to the selling price.");
    const body: Record<string, unknown> = {
      name: f.name.trim(), status: f.status, price, regularPrice: regular,
      image: f.image.trim() || null, categorySlugs: f.categorySlugs, brandSlug: f.brandSlug || null,
      shortDescription: f.shortDescription.trim(), description: f.description.trim(),
      lowStockThreshold: parseInt(f.lowStockThreshold, 10) || 0, featured: f.featured,
    };
    if (can("finance:view")) body.costPrice = cost;
    if (isNew) {
      body.stock = Math.max(0, parseInt(f.stock, 10) || 0);
      if (f.sku.trim()) body.sku = f.sku.trim();
      if (f.slug.trim()) body.slug = f.slug.trim();
    } else {
      body.sku = f.sku.trim();
      body.slug = f.slug.trim();
    }
    setBusy(true);
    try {
      await api(isNew ? "/api/admin/products" : `/api/admin/products/${product!.id}`, { method: isNew ? "POST" : "PUT", json: body });
      toast(isNew ? "Product created" : "Changes saved");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const section = "text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-3 mt-1";

  return (
    <Modal
      wide
      title={isNew ? (template ? "Duplicate product" : "Add product") : "Edit product"}
      onClose={onClose}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={save}>{isNew ? "Create product" : "Save changes"}</Button>
      </>}
    >
      {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4" role="alert">{err}</div>}
      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <div className="space-y-6">
          <div>
            <div className={section}>General</div>
            <div className="space-y-3.5">
              <Field label="Product name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="HP EliteBook 840 G8 — Core i7, 16GB, 512GB SSD" autoFocus /></Field>
              <Field label="Short description" hint="Shown under the title on product cards."><Input value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={400} /></Field>
              <Field label="Full description" hint="Plain text or simple HTML."><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={5} /></Field>
            </div>
          </div>
          <div>
            <div className={section}>Pricing (GH₵)</div>
            <div className="grid sm:grid-cols-3 gap-3.5">
              <Field label="Selling price"><Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" /></Field>
              <Field label="Regular price" hint={discount ? `Shows −${discount}% on the store` : "Optional, to show a discount"}><Input inputMode="decimal" value={f.regularPrice} onChange={(e) => set("regularPrice", e.target.value)} placeholder="0.00" /></Field>
              {can("finance:view") && <Field label="Cost price" hint={margin != null ? `Margin ${margin}%` : "Private — for margin reports"}><Input inputMode="decimal" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" /></Field>}
            </div>
          </div>
          <div>
            <div className={section}>Inventory</div>
            <div className="grid sm:grid-cols-3 gap-3.5">
              <Field label="SKU" hint={isNew ? "Leave empty to generate" : undefined}><Input value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="HP-840-G8" /></Field>
              {isNew ? (
                <Field label="Opening stock"><Input type="number" min={0} value={f.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
              ) : (
                <Field label="Current stock" hint="Change it with “Adjust stock”"><Input value={String(product!.stock)} disabled /></Field>
              )}
              <Field label="Low-stock alert at"><Input type="number" min={0} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} /></Field>
            </div>
          </div>
          <div>
            <div className={section}>Categories</div>
            <div className="flex flex-wrap gap-1.5">
              {topCats.flatMap((c) => [c, ...subCats(c.id)]).map((c) => {
                const on = f.categorySlugs.includes(c.slug);
                return (
                  <button type="button" key={c.slug} onClick={() => set("categorySlugs", on ? f.categorySlugs.filter((s) => s !== c.slug) : [...f.categorySlugs, c.slug])}
                    className={cx("px-2.5 py-1 rounded-full border text-[12px] font-medium transition-colors", on ? "bg-[var(--em-red)] border-[var(--em-red)] text-white" : "border-slate-200 text-slate-600 hover:border-slate-300", !!c.parent && "italic")}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <Field label="Visibility">
            <Select value={f.status} onChange={(e) => set("status", e.target.value as PRow["status"])}>
              <option value="ACTIVE">Active — visible in store</option>
              <option value="DRAFT">Draft — hidden</option>
              <option value="ARCHIVED">Archived — hidden</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-[var(--em-red)] w-4 h-4" /> Featured (Best Sellers)
          </label>
          <Field label="Brand">
            <Select value={f.brandSlug} onChange={(e) => set("brandSlug", e.target.value)}>
              <option value="">No brand</option>
              {tax.brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Image" hint="/images/… path or https:// URL">
            <Input value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="/images/cl/p-lenovo.png" />
          </Field>
          <div className="aspect-square rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.image ? <img src={f.image} alt="Preview" className="max-w-full max-h-full object-contain" /> : <ImageOff className="text-slate-300" />}
          </div>
          {!isNew && (
            <Field label="URL slug"><Input value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></Field>
          )}
        </aside>
      </div>
    </Modal>
  );
}
