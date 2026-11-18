"use client";
/* Product card, product carousels, section headers */
import { useRef } from "react";
import { useStore, money } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Heart, ShoppingCart, ChevronLeft, ChevronRight, Star } from "lucide-react";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (rating <= 0) return null;
  return (
    <span className="flex items-center gap-0.5" title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? "fill-[#f5a623] text-[#f5a623]" : "text-gray-300"} />
      ))}
      {count !== undefined && count > 0 && <span className="text-[10px] text-gray-400 ml-1">({count})</span>}
    </span>
  );
}

export function PlaceholderThumb({ name }: { name: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#f5f6fa] to-[#e8ebf2] text-[#8a90a3]">
      <span className="text-[26px] font-black tracking-tight text-[#b0b7c9]">{name.slice(0, 2).toUpperCase()}</span>
      <span className="text-[10px] px-3 text-center line-clamp-2 leading-tight">{name.slice(0, 42)}</span>
    </div>
  );
}

export function ProductCard({ p, compact = false }: { p: Product; compact?: boolean }) {
  const { addToCart, toggleWish, wishlist } = useStore();
  const wished = wishlist.includes(p.id);
  return (
    <div className="group bg-white border border-gray-200 rounded-md overflow-hidden relative hover:shadow-[0_8px_24px_rgba(0,0,0,.1)] hover:border-gray-300 transition-all h-full flex flex-col">
      {p.discount > 0 && (
        <span className="absolute top-2 left-2 z-10 bg-[var(--em-red)] text-white text-[11px] font-bold rounded px-1.5 py-0.5">-{p.discount}%</span>
      )}
      <button
        className={`absolute top-2 ${p.discount > 0 ? "left-[52px]" : "left-2"} z-10 w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:text-[var(--em-red)] transition-colors ${wished ? "text-[var(--em-red)] border-[var(--em-red)]" : "text-gray-400 border-gray-200"}`}
        onClick={() => toggleWish(p.id, p.name)}
        aria-label="Add to wishlist"
      >
        <Heart size={14} className={wished ? "fill-[var(--em-red)]" : ""} />
      </button>
      <a href={`#/product/${p.slug}`} className="block p-3 pb-1">
        <div className={`${compact ? "h-[130px]" : "h-[170px]"} flex items-center justify-center`}>
          {p.image ? (
            <img src={p.image} alt={p.name} loading="lazy" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <PlaceholderThumb name={p.name} />
          )}
        </div>
      </a>
      <div className="px-3 pb-3 flex flex-col flex-1">
        {p.categories[0] && (
          <a href={`#/category/${p.categories[0].slug}`} className="text-[10.5px] text-gray-400 hover:text-[var(--em-red)] line-clamp-1 mb-1">{p.categories[0].name}</a>
        )}
        <a href={`#/product/${p.slug}`} className="text-[12.5px] font-semibold text-[#232630] leading-snug line-clamp-2 hover:text-[var(--em-red)] mb-1.5 min-h-[32px]">
          {p.name}
        </a>
        <Stars rating={p.averageRating} count={p.reviewCount} />
        <div className="mt-auto pt-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[14.5px] font-extrabold text-[var(--em-red)]">{p.priceFmt}</span>
            {p.regularFmt && <span className="text-[12px] text-gray-400 line-through">{p.regularFmt}</span>}
          </div>
          {p.brand && (
            <div className="text-[11px] text-gray-500 mt-0.5">Brand : <a href={`#/brand/${p.brand.slug}`} className="hover:text-[var(--em-red)]">{p.brand.name}</a></div>
          )}
          <button
            onClick={() => addToCart({ id: p.id, slug: p.slug, name: p.name, price: p.price, priceFmt: p.priceFmt, image: p.image, stock: p.inStock })}
            disabled={!p.inStock}
            className="mt-2 w-full bg-[var(--em-red)] text-white text-[12px] font-bold py-[7px] rounded hover:bg-[#c00018] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <ShoppingCart size={13} /> {p.inStock ? "Add to cart" : "Out of stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCarousel({ products, id }: { products: Product[]; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  };
  if (products.length === 0) return null;
  return (
    <div className="relative">
      <div ref={ref} className="flex gap-3 overflow-x-auto scroll-smooth snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[210px] md:w-[calc((100%-45px)/5)] xl:w-[calc((100%-60px)/6)]">
            <ProductCard p={p} compact />
          </div>
        ))}
      </div>
      <button onClick={() => scroll(-1)} aria-label="Previous" className="absolute -left-3 top-[35%] w-9 h-9 rounded-full bg-white shadow-md border flex items-center justify-center hover:bg-[var(--em-red)] hover:text-white z-10">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => scroll(1)} aria-label="Next" className="absolute -right-3 top-[35%] w-9 h-9 rounded-full bg-white shadow-md border flex items-center justify-center hover:bg-[var(--em-red)] hover:text-white z-10">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function SectionHeader({ title, href, banner }: { title: string; href: string; banner?: string }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h2 className="text-[19px] md:text-[21px] font-extrabold text-[#232630] flex items-center gap-2.5">
        <span className="w-1.5 h-6 bg-[var(--em-red)] rounded-full inline-block" />
        {title} <span className="text-gray-300 font-medium hidden md:inline">|</span> <span className="text-[var(--em-red)] hidden md:inline">Now Open</span>
      </h2>
      <a href={href} className="text-[13px] font-bold text-[#232630] border-b-2 border-[var(--em-red)] pb-0.5 hover:text-[var(--em-red)]">
        {banner ? "View More" : "View More"}
      </a>
    </div>
  );
}

export function PriceBlock({ p }: { p: Product }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-extrabold text-[var(--em-red)]">{p.priceFmt}</span>
      {p.regularFmt && <span className="text-sm text-gray-400 line-through">{p.regularFmt}</span>}
      {p.discount > 0 && <span className="text-[11px] bg-[#eaf1fd] text-[var(--em-red)] font-bold px-1.5 py-0.5 rounded">-{p.discount}%</span>}
    </div>
  );
}

export { money };
