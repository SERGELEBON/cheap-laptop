"use client";
/* Homepage: hero slider, category tiles, product sections, brands, features */
import { useEffect, useMemo, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { HERO_SLIDES, type Catalog } from "@/lib/types";
import { ProductCard, ProductCarousel, SectionHeader, Stars, PriceBlock } from "./cards";
import { FeaturesStrip } from "./chrome";
import { ChevronLeft, ChevronRight, ShoppingCart, Heart } from "lucide-react";

function HeroSlider({ catalog }: { catalog: Catalog }) {
  const [idx, setIdx] = useState(0);
  const per = 1;
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + per) % HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);
  const slide = HERO_SLIDES[idx];
  return (
    <div className="relative overflow-hidden bg-[#101018]">
      <div className="relative h-[240px] md:h-[420px] xl:h-[470px]">
        {HERO_SLIDES.map((s, i) => (
          <a
            key={s.label}
            href={`#/category/${s.cat}`}
            aria-label={s.label}
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            <img src={s.banner} alt={`${s.label} — Cheap Laptops Ghana`} className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
      <button onClick={() => setIdx((idx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="Previous slide" className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-[var(--em-red)] hover:text-white transition-colors">
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => setIdx((idx + 1) % HERO_SLIDES.length)} aria-label="Next slide" className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-[var(--em-red)] hover:text-white transition-colors">
        <ChevronRight size={20} />
      </button>
      <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-[var(--em-red)]" : "w-2.5 bg-white/70"}`} />
        ))}
      </div>
    </div>
  );
}

function CategoryTiles({ catalog }: { catalog: Catalog }) {
  const [page, setPage] = useState(0);
  const perPage = 9;
  const pages = Math.ceil(HERO_SLIDES.length / perPage);
  return (
    <div className="max-w-[1250px] mx-auto px-3 -mt-0 pt-6">
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {HERO_SLIDES.slice(page * perPage, page * perPage + perPage).map((s) => (
          <a key={s.label} href={`#/category/${s.cat}`} className="group rounded-lg overflow-hidden border bg-white hover:shadow-md transition-shadow">
            <div className="aspect-square overflow-hidden bg-gray-50">
              <img src={s.img} alt={s.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="text-center text-[12px] font-semibold py-2 text-[#232630] group-hover:text-[var(--em-red)]">{s.label}</div>
          </a>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="Previous"><ChevronLeft size={14} /></button>
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="w-7 h-7 rounded border flex items-center justify-center" aria-label="Next"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

function BrandsCarousel({ catalog }: { catalog: Catalog }) {
  const brands = catalog.brands.filter((b) => b.logo && b.count > 0);
  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {brands.map((b) => (
          <a key={b.id} href={`#/brand/${b.slug}`} className="shrink-0 w-[150px] h-[90px] bg-white border rounded-md flex items-center justify-center p-3 hover:shadow-md hover:border-gray-300 transition-all">
            <img src={b.logo!} alt={b.name} loading="lazy" className="max-h-full max-w-full object-contain" />
          </a>
        ))}
      </div>
    </div>
  );
}

function pickHighlight(catalog: Catalog) {
  const names = ["MacBook Air 13", "HP Victus 15", "Lenovo LOQ 15"];
  for (const n of names) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const f = catalog.products.find((x) => x.price > 0 && norm(x.name).includes(norm(n)) && x.image);
    if (f) return f;
  }
  return catalog.products.find((x) => x.price > 0 && x.image && x.onSale);
}

function HighlightProduct({ catalog }: { catalog: Catalog }) {
  const { addToCart, toggleWish, wishlist } = useStore();
  const p = pickHighlight(catalog);
  if (!p) return null;
  const wished = wishlist.includes(p.id);
  return (
    <div className="mt-10 rounded-lg border bg-gradient-to-r from-[#101018] to-[#26283a] text-white overflow-hidden">
      <div className="grid md:grid-cols-2 items-center">
        <div className="p-7 md:p-10">
          <span className="text-[11px] font-bold uppercase tracking-widest bg-[var(--em-red)] px-2.5 py-1 rounded">Deal of the day</span>
          <h3 className="mt-4 text-xl md:text-2xl font-extrabold leading-snug">{p.name}</h3>
          <div className="mt-2"><Stars rating={p.averageRating} count={p.reviewCount} /></div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-black text-[var(--em-red)]">{p.priceFmt}</span>
            {p.regularFmt && <span className="text-gray-400 line-through">{p.regularFmt}</span>}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => addToCart({ id: p.id, slug: p.slug, name: p.name, price: p.price, priceFmt: p.priceFmt, image: p.image, stock: p.inStock })}
              className="bg-[var(--em-red)] hover:bg-[#c00018] text-white font-bold text-sm px-6 py-3 rounded flex items-center gap-2 transition-colors"
            >
              <ShoppingCart size={16} /> Add to cart
            </button>
            <button
              onClick={() => toggleWish(p.id, p.name)}
              className={`border px-4 py-3 rounded flex items-center gap-2 text-sm font-semibold ${wished ? "border-[var(--em-red)] text-[var(--em-red)]" : "border-white/30 text-white hover:border-white"}`}
            >
              <Heart size={16} className={wished ? "fill-[var(--em-red)]" : ""} /> Wishlist
            </button>
          </div>
        </div>
        <div className="h-[260px] md:h-[340px] p-6">
          {p.image && <img src={p.image} alt={p.name} className="max-h-full mx-auto object-contain drop-shadow-2xl" />}
        </div>
      </div>
    </div>
  );
}

export function HomeView({ catalog }: { catalog: Catalog }) {
  const bySlug = useMemo(() => {
    const m = new Map<string, Catalog["products"][number]>();
    catalog.products.forEach((p) => m.set(p.slug, p));
    return m;
  }, [catalog]);

  return (
    <div className="pb-10">
      <HeroSlider catalog={catalog} />
      <CategoryTiles catalog={catalog} />

      <div className="max-w-[1250px] mx-auto px-3 mt-8 space-y-10">
        {catalog.homeSections.map((sec, i) => {
          const products = sec.products.map((s) => bySlug.get(s)).filter(Boolean) as Catalog["products"];
          return (
            <section key={sec.slug} aria-label={sec.title}>
              <SectionHeader title={sec.title} href={`#/category/${sectionCat(sec.title)}`} />
              {sec.title === "Accessories" && (
                <div className="mb-4 rounded-lg bg-[#eaf1fd] border border-[#c9daff] px-5 py-4 text-[13.5px] text-[#1c3a75]">
                  Padded laptop backpacks, wireless mice and headsets in stock — and remember: every boxed laptop comes with a <b>FREE bag &amp; mouse</b> while the promo lasts!
                </div>
              )}
              {sec.title === "Electric Bikes & Scooters" && (
                <div className="mb-4 rounded-lg bg-[#fff8e1] border border-[#ffe08a] px-5 py-4 text-[13.5px] text-[#6b5200]">
                  Luxury Electric Bikes &amp; Scooters available at our Accra store — GH₵ 7k / 10k / 12k fixed, non-negotiable. Call <b>0240 999979</b> or visit us to inspect!
                </div>
              )}
              <ProductCarousel products={products} id={sec.slug} />
            </section>
          );
        })}

        <section aria-label="Shop Our Brands">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[19px] md:text-[21px] font-extrabold text-[#232630] flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-[var(--em-red)] rounded-full inline-block" /> Shop Our Brands
            </h2>
            <a href="#/brands" className="text-[13px] font-bold text-[#232630] border-b-2 border-[var(--em-red)] pb-0.5 hover:text-[var(--em-red)]">View More</a>
          </div>
          <BrandsCarousel catalog={catalog} />
          <HighlightProduct catalog={catalog} />
        </section>

        <section aria-label="Trending Brands">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[19px] md:text-[21px] font-extrabold text-[#232630] flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-[var(--em-red)] rounded-full inline-block" /> Trending Brands
            </h2>
            <a href="#/brands" className="text-[13px] font-bold text-[#232630] border-b-2 border-[var(--em-red)] pb-0.5 hover:text-[var(--em-red)]">View More</a>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {catalog.brands.filter((b) => b.count > 0).slice(0, 16).map((b) => (
              <a key={b.id} href={`#/brand/${b.slug}`} className="h-[64px] bg-white border rounded-md flex items-center justify-center px-2 hover:shadow-md transition-shadow">
                {b.logo ? (
                  <img src={b.logo} alt={b.name} loading="lazy" className="max-h-[80%] max-w-[90%] object-contain" />
                ) : (
                  <span className="text-[11px] font-bold text-gray-600 text-center leading-tight">{b.name}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <FeaturesStrip />
      </div>
    </div>
  );
}

function sectionCat(title: string): string {
  const map: Record<string, string> = {
    "Best Sellers": "shop",
    "Gaming Laptops": "laptops/gaming-laptops",
    "Business Laptops": "laptops/business-laptops",
    "Student Laptops": "laptops/student-laptops",
    "MacBooks": "macbooks",
    "2-in-1 & Detachable": "laptops/2-in-1-detachable",
    "Accessories": "accessories",
    "Electric Bikes & Scooters": "scooters",
    "New Arrivals": "shop",
  };
  return map[title] || "shop";
}
