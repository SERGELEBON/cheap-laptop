"use client";
/* Category / brand / search / shop views with filters, sort and pagination */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Catalog, Product } from "@/lib/types";
import { ProductCard } from "./cards";
import { Breadcrumb } from "./chrome";
import { SlidersHorizontal, ChevronRight, Search as SearchIcon, PackageSearch } from "lucide-react";

const PER_PAGE = 24;

function sortProducts(products: Product[], sort: string): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price-asc": return arr.sort((a, b) => a.price - b.price);
    case "price-desc": return arr.sort((a, b) => b.price - a.price);
    case "name": return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "rating": return arr.sort((a, b) => b.averageRating - a.averageRating);
    case "discount": return arr.sort((a, b) => b.discount - a.discount);
    default: return arr;
  }
}

function Grid({ products, page, onPage }: { products: Product[]; page: number; onPage: (p: number) => void }) {
  const slice = products.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {slice.map((p) => <ProductCard key={p.id} p={p} compact />)}
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(products.length / PER_PAGE))} onPage={onPage} />
    </>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const go = (p: number) => {
    onPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const nums: number[] = [];
  const from = Math.max(1, Math.min(page - 2, pages - 5));
  for (let p = from; p <= Math.min(pages, from + 5); p++) nums.push(p);
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button onClick={() => go(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 text-[13px] border rounded disabled:opacity-40 hover:border-[var(--em-red)]">Previous</button>
      {nums.map((p) => (
        <button key={p} onClick={() => go(p)} className={`w-9 h-9 text-[13px] border rounded ${p === page ? "bg-[var(--em-red)] text-white border-[var(--em-red)]" : "hover:border-[var(--em-red)]"}`}>
          {p}
        </button>
      ))}
      {pages > 6 && <span className="px-1 text-gray-400">…</span>}
      <button onClick={() => go(Math.min(pages, page + 1))} disabled={page >= pages} className="px-3 py-1.5 text-[13px] border rounded disabled:opacity-40 hover:border-[var(--em-red)]">Next</button>
    </div>
  );
}

function Toolbar({ count, sort, setSort }: { count: number; sort: string; setSort: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between bg-white border rounded-md px-4 py-2.5 mb-4 flex-wrap gap-2">
      <span className="text-[13px] text-gray-500">Showing <b className="text-[#232630]">{count}</b> products</span>
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={15} className="text-gray-400" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-[13px] border rounded px-2.5 py-1.5 outline-none bg-white" aria-label="Trier">
          <option value="default">Default sorting</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Top rated</option>
          <option value="discount">Biggest discounts</option>
        </select>
      </div>
    </div>
  );
}

export function CategoryView({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setPage(1);
    setMaxPrice(null);
  }

  const cat = catalog.categoriesBySlug[slug];

  const subcats = useMemo(() => catalog.categories.filter((c) => c.parent === cat?.id && c.count > 0), [catalog, cat]);
  const allSlugSet = useMemo(() => {
    // include descendants products
    const ids: number[] = [];
    const walk = (id: number) => {
      ids.push(id);
      catalog.categories.filter((c) => c.parent === id).forEach((c) => walk(c.id));
    };
    if (cat) walk(cat.id);
    return new Set(ids);
  }, [catalog, cat]);

  const products = useMemo(() => {
    if (!cat) return [];
    let list = catalog.products.filter((p) => p.categories.some((c) => allSlugSet.has(c.id)));
    if (maxPrice) list = list.filter((p) => p.price <= maxPrice);
    return sortProducts(list, sort);
  }, [catalog, cat, allSlugSet, sort, maxPrice]);

  if (!cat) {
    return (
      <div className="max-w-[1250px] mx-auto px-3 py-16 text-center">
        <PackageSearch size={44} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Category not found</h1>
        <a href="#/shop" className="text-[var(--em-red)] font-semibold mt-2 inline-block">Browse all products →</a>
      </div>
    );
  }

  const trail: { label: string; href?: string }[] = [];
  // build breadcrumb from ancestors
  let cur = cat;
  const chain = [cur];
  while (chain[0].parent) {
    const parent = catalog.categories.find((c) => c.id === chain[0].parent);
    if (!parent) break;
    chain.unshift(parent);
  }
  chain.forEach((c) => trail.push({ label: c.name, href: `#/category/${c.slug}` }));

  return (
    <div>
      <Breadcrumb trail={trail} />
      {cat.banner && (
        <div className="max-w-[1250px] mx-auto px-3 pt-4">
          <a href="#/shop?sale=1" className="block rounded-lg overflow-hidden">
            <img src={cat.banner} alt={cat.name} className="w-full h-[130px] md:h-[220px] object-cover rounded-lg" />
          </a>
        </div>
      )}
      <div className="max-w-[1250px] mx-auto px-3 py-5">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-1">{cat.name}</h1>
        {cat.yoastDesc && <p className="text-[13px] text-gray-500 mb-4 max-w-[820px]">{cat.yoastDesc}</p>}
        {subcats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subcats.map((s) => (
              <a key={s.id} href={`#/category/${s.slug}`} className="text-[12.5px] font-semibold border rounded-full px-3.5 py-1.5 bg-white hover:border-[var(--em-red)] hover:text-[var(--em-red)] transition-colors">
                {s.name} <span className="text-gray-400">({s.count})</span>
              </a>
            ))}
          </div>
        )}
        <Toolbar count={products.length} sort={sort} setSort={setSort} />
        <div className="flex gap-5">
          <aside className="hidden lg:block w-[220px] shrink-0 space-y-4">
            <div className="bg-white border rounded-md p-4">
              <h3 className="font-bold text-[14px] mb-3">Filter by price</h3>
              <input
                type="range"
                min={100}
                max={50000}
                step={100}
                value={maxPrice ?? 50000}
                onChange={(e) => { setMaxPrice(+e.target.value >= 50000 ? null : +e.target.value); setPage(1); }}
                className="w-full accent-[var(--em-red)]"
                aria-label="Prix maximum"
              />
              <div className="text-[12px] text-gray-500 mt-1.5">
                {maxPrice ? `Up to GH₵ ${maxPrice.toLocaleString()}` : "Up to GH₵ 50,000"}
                {maxPrice && <button onClick={() => setMaxPrice(null)} className="ml-2 text-[var(--em-red)] font-semibold">Reset</button>}
              </div>
            </div>
            {subcats.length > 0 && (
              <div className="bg-white border rounded-md p-4">
                <h3 className="font-bold text-[14px] mb-3">Product categories</h3>
                <ul className="space-y-1.5">
                  {subcats.map((s) => (
                    <li key={s.id}>
                      <a href={`#/category/${s.slug}`} className="flex items-center justify-between text-[12.5px] text-gray-600 hover:text-[var(--em-red)] py-0.5">
                        <span className="flex items-center gap-1"><ChevronRight size={11} /> {s.name}</span>
                        <span className="text-gray-400">({s.count})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
          <div className="flex-1 min-w-0">
            <Grid products={products} page={page} onPage={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandView({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const brand = catalog.brandsBySlug[slug];
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setPage(1);
  }
  const products = useMemo(() => {
    if (!brand) return [];
    return sortProducts(catalog.products.filter((p) => p.brand?.slug === slug), sort);
  }, [catalog, brand, slug, sort]);

  if (!brand) {
    return (
      <div className="max-w-[1250px] mx-auto px-3 py-16 text-center">
        <PackageSearch size={44} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Brand not found</h1>
        <a href="#/brands" className="text-[var(--em-red)] font-semibold mt-2 inline-block">All brands →</a>
      </div>
    );
  }
  return (
    <div>
      <Breadcrumb trail={[{ label: "Brands", href: "#/brands" }, { label: brand.name }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <div className="flex items-center gap-5 mb-5">
          {brand.logo ? (
            <div className="w-[110px] h-[70px] bg-white border rounded-md flex items-center justify-center p-2">
              <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-[110px] h-[70px] bg-white border rounded-md flex items-center justify-center p-2 font-black text-lg text-[var(--em-red)]">{brand.name.slice(0, 10)}</div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#232630]">{brand.name}</h1>
            <p className="text-[13px] text-gray-500">{products.length} products available at Cheap Laptops — Home of Affordable Laptops & Computers</p>
          </div>
        </div>
        <Toolbar count={products.length} sort={sort} setSort={setSort} />
        <Grid products={products} page={page} onPage={setPage} />
      </div>
    </div>
  );
}

export function SearchView({ catalog, q }: { catalog: Catalog; q: string }) {
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const products = useMemo(() => {
    const n = q.toLowerCase().trim();
    return sortProducts(catalog.products.filter((p) => p.name.toLowerCase().includes(n) || (p.brand?.name.toLowerCase().includes(n)) || p.categories.some((c) => c.name.toLowerCase().includes(n))), sort);
  }, [catalog, q, sort]);
  return (
    <div>
      <Breadcrumb trail={[{ label: `Search results for “${q}”` }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5 flex items-center gap-3">
          <SearchIcon size={24} className="text-[var(--em-red)]" /> Search results for “{q}”
        </h1>
        {products.length === 0 ? (
          <div className="text-center py-16">
            <PackageSearch size={48} className="mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500">No products were found matching your selection.</p>
            <a href="#/shop" className="text-[var(--em-red)] font-semibold mt-2 inline-block">Browse all products →</a>
          </div>
        ) : (
          <>
            <Toolbar count={products.length} sort={sort} setSort={setSort} />
            <Grid products={products} page={page} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export function ShopView({ catalog, sale }: { catalog: Catalog; sale?: boolean }) {
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const products = useMemo(() => {
    const list = sale ? catalog.products.filter((p) => p.onSale) : catalog.products.filter((p) => p.price > 0);
    return sortProducts(list, sort);
  }, [catalog, sale, sort]);
  return (
    <div>
      <Breadcrumb trail={[{ label: sale ? "Promo — On Sale" : "Shop" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5">{sale ? "Promo — Deals & Discounts" : "Shop All Products"}</h1>
        <Toolbar count={products.length} sort={sort} setSort={setSort} />
        <Grid products={products} page={page} onPage={setPage} />
      </div>
    </div>
  );
}

export function CategoriesIndex({ catalog }: { catalog: Catalog }) {
  const roots = catalog.categories.filter((c) => c.parent === 0 && c.count > 0).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <Breadcrumb trail={[{ label: "All Categories" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-6">Browse Product Categories</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roots.map((r) => {
            const subs = catalog.categories.filter((c) => c.parent === r.id && c.count > 0);
            return (
              <div key={r.id} className="bg-white border rounded-md p-5">
                <a href={`#/category/${r.slug}`} className="font-bold text-[15px] text-[#232630] hover:text-[var(--em-red)] flex items-center justify-between">
                  {r.name} <span className="text-gray-400 text-[12px] font-medium">{r.count} products</span>
                </a>
                {subs.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t pt-3">
                    {subs.slice(0, 6).map((s) => (
                      <li key={s.id}>
                        <a href={`#/category/${s.slug}`} className="text-[12.5px] text-gray-600 hover:text-[var(--em-red)]">{s.name}</a>
                      </li>
                    ))}
                    {subs.length > 6 && (
                      <li>
                        <a href={`#/category/${r.slug}`} className="text-[12.5px] font-semibold text-[var(--em-red)]">View all →</a>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BrandsIndex({ catalog }: { catalog: Catalog }) {
  const withCount = catalog.brands.filter((b) => b.count > 0);
  return (
    <div>
      <Breadcrumb trail={[{ label: "Brands" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-6">Shop by Brands</h1>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {withCount.map((b) => (
            <a key={b.id} href={`#/brand/${b.slug}`} className="h-[90px] bg-white border rounded-md flex flex-col items-center justify-center p-3 gap-1 hover:shadow-md hover:border-[var(--em-red)] transition-all">
              {b.logo ? (
                <img src={b.logo} alt={b.name} loading="lazy" className="max-h-[46px] max-w-full object-contain" />
              ) : (
                <span className="font-black text-[15px] text-[var(--em-red)]">{b.name.slice(0, 9)}</span>
              )}
              <span className="text-[10.5px] text-gray-400">{b.count} products</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
