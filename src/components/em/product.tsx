"use client";
/* Product detail view */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Catalog } from "@/lib/types";
import { ProductCard, Stars, PlaceholderThumb } from "./cards";
import { Breadcrumb } from "./chrome";
import { Heart, ShoppingCart, Check, Minus, Plus, PackageSearch, Zap } from "lucide-react";

export function ProductView({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const { addToCart, toggleWish, wishlist, navigate } = useStore();
  const p = catalog.productsBySlug[slug];
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState<"desc" | "specs" | "ship">("desc");
  const [prevSlug, setPrevSlug] = useState(slug);
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setQty(1);
    setImgIdx(0);
    setTab("desc");
  }

  const related = useMemo(() => {
    if (!p) return [];
    const catIds = new Set(p.categories.map((c) => c.id));
    let list = catalog.products.filter((x) => x.id !== p.id && x.price > 0 && x.categories.some((c) => catIds.has(c.id)));
    if (list.length < 6) {
      const extra = catalog.products.filter((x) => x.id !== p.id && x.price > 0 && x.brand && p.brand && x.brand.slug === p.brand.slug && !list.includes(x));
      list = [...list, ...extra];
    }
    return list.slice(0, 10);
  }, [catalog, p]);

  if (!p) {
    return (
      <div className="max-w-[1250px] mx-auto px-3 py-16 text-center">
        <PackageSearch size={44} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Product not found</h1>
        <a href="#/shop" className="text-[var(--em-red)] font-semibold mt-2 inline-block">Browse all products →</a>
      </div>
    );
  }

  const wished = wishlist.includes(p.id);
  const mainCat = p.categories[p.categories.length - 1] || p.categories[0];
  const trail: { label: string; href?: string }[] = [];
  if (mainCat) trail.push({ label: mainCat.name, href: `#/category/${mainCat.slug}` });
  trail.push({ label: p.name });

  const line = { id: p.id, slug: p.slug, name: p.name, price: p.price, priceFmt: p.priceFmt, image: p.image, stock: p.inStock };

  return (
    <div className="pb-10">
      <Breadcrumb trail={trail} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <div className="grid lg:grid-cols-[460px_1fr] gap-8 bg-white border rounded-lg p-5 md:p-7">
          {/* Gallery */}
          <div>
            <div className="relative border rounded-md overflow-hidden bg-white h-[340px] md:h-[430px] flex items-center justify-center">
              {p.discount > 0 && <span className="absolute top-3 left-3 z-10 bg-[var(--em-red)] text-white text-[12px] font-bold rounded px-2 py-1">-{p.discount}%</span>}
              {p.image ? (
                <img src={p.gallery[imgIdx] || p.image} alt={p.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <PlaceholderThumb name={p.name} />
              )}
            </div>
            {p.gallery.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {p.gallery.map((g, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 border rounded flex items-center justify-center shrink-0 ${i === imgIdx ? "border-[var(--em-red)]" : ""}`} aria-label={`Image ${i + 1}`}>
                    <img src={g} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Info */}
          <div>
            <h1 className="text-[20px] md:text-[24px] font-extrabold text-[#232630] leading-snug">{p.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Stars rating={p.averageRating} count={p.reviewCount} />
              {p.sku && <span className="text-[12px] text-gray-400">SKU: {p.sku}</span>}
              <span className={`text-[12px] font-semibold ${p.inStock ? "text-[#1e9e4a]" : "text-red-500"}`}>
                {p.inStock ? "In stock" : "Out of stock"}
              </span>
            </div>
            {p.brand && (
              <div className="text-[13px] text-gray-600 mt-2">
                Brand: <a href={`#/brand/${p.brand.slug}`} className="font-bold text-[#232630] hover:text-[var(--em-red)]">{p.brand.name}</a>
              </div>
            )}
            <div className="flex items-baseline gap-3 mt-4 flex-wrap">
              <span className="text-[28px] font-black text-[var(--em-red)]">{p.priceFmt}</span>
              {p.regularFmt && <span className="text-[15px] text-gray-400 line-through">{p.regularFmt}</span>}
              {p.discount > 0 && (
                <span className="text-[12px] bg-[#eaf1fd] text-[var(--em-red)] font-bold px-2 py-1 rounded">You save {p.discount}%</span>
              )}
            </div>
            {p.shortDescription && (
              <div className="mt-4 text-[13.5px] text-gray-600 leading-relaxed border-y py-4 whitespace-pre-line">{p.shortDescription}</div>
            )}
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center border rounded-md overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2.5 hover:bg-gray-50" aria-label="Decrease quantity"><Minus size={14} /></button>
                <span className="px-4 py-2.5 text-[14px] font-bold w-12 text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2.5 hover:bg-gray-50" aria-label="Increase quantity"><Plus size={14} /></button>
              </div>
              <button
                onClick={() => addToCart(line, qty)}
                disabled={!p.inStock}
                className="bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] disabled:bg-gray-300 text-white font-bold text-[14px] px-7 py-3 rounded flex items-center gap-2 transition-colors"
              >
                <ShoppingCart size={16} /> Add to cart
              </button>
              <button
                onClick={() => { addToCart(line, qty); navigate({ name: "checkout" }); }}
                disabled={!p.inStock}
                className="border-2 border-[#232630] hover:bg-[#232630] hover:text-white disabled:opacity-40 text-[#232630] font-bold text-[14px] px-7 py-[10px] rounded flex items-center gap-2 transition-colors"
              >
                <Zap size={16} /> Buy now
              </button>
              <button
                onClick={() => toggleWish(p.id, p.name)}
                className={`w-11 h-11 border rounded flex items-center justify-center ${wished ? "border-[var(--em-red)] text-[var(--em-red)]" : "text-gray-500 hover:text-[var(--em-red)]"}`}
                aria-label="Add to wishlist"
              >
                <Heart size={18} className={wished ? "fill-[var(--em-red)]" : ""} />
              </button>
            </div>
            <ul className="mt-5 space-y-1.5 text-[12.5px] text-gray-600">
              <li className="flex items-center gap-2"><Check size={14} className="text-[#1e9e4a]" /> FREE Bag &amp; Mouse with every boxed laptop</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-[#1e9e4a]" /> Cash on Delivery available in Accra</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-[#1e9e4a]" /> Nationwide delivery — Accra, Kumasi, Tamale &amp; beyond</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-[#1e9e4a]" /> Special prices for buyers &amp; dealers — call 0240 999979</li>
            </ul>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border rounded-lg mt-6 overflow-hidden">
          <div className="flex border-b">
            {([
              ["desc", "Description"],
              ["specs", "Specifications"],
              ["ship", "Shipping & Returns"],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-6 py-3.5 text-[13.5px] font-bold border-b-2 -mb-px transition-colors ${tab === k ? "border-[var(--em-red)] text-[var(--em-red)]" : "border-transparent text-gray-500 hover:text-[#232630]"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-5 md:p-7 text-[14px] text-gray-700 leading-relaxed">
            {tab === "desc" && (
              p.description ? (
                <div className="whitespace-pre-line">{p.description}</div>
              ) : (
                <div>
                  <p>{p.name} is available at Cheap Laptops — Home of Affordable Laptops &amp; Computers{p.brand ? `, your trusted ${p.brand.name} stockist` : ""}. Genuine boxed product with brand warranty, nationwide delivery and easy 7-day returns. Every boxed laptop comes with a FREE bag and mouse.</p>
                  <p className="mt-3">Order online today or call us on <a href="tel:0240999979" className="text-[var(--em-red)] font-semibold">0240 999979</a> / <a href="tel:02086999988" className="text-[var(--em-red)] font-semibold">0208 699 988</a> for dealer prices. Stores: Accra (Haatso, Ecobank area), Kumasi (Asafo Labour) and Tamale (Market).</p>
                </div>
              )
            )}
            {tab === "specs" && (
              <div>
                <table className="w-full text-[13.5px]">
                  <tbody>
                    {[
                      ["Product name", p.name],
                      ["SKU", p.sku || "—"],
                      ["Brand", p.brand?.name || "—"],
                      ["Category", p.categories.map((c) => c.name).join(", ") || "—"],
                      ["Availability", p.inStock ? "In stock" : "Out of stock"],
                      ["Warranty", "1-Year brand warranty"],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-semibold text-[#232630] w-[180px]">{k}</td>
                        <td className="py-2.5 text-gray-600">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {p.shortDescription && <div className="mt-4 text-gray-600 whitespace-pre-line">{p.shortDescription}</div>}
              </div>
            )}
            {tab === "ship" && (
              <div className="space-y-3">
                <p><b>Delivery:</b> Nationwide delivery across Ghana. Same-day delivery within Accra for orders confirmed before 12PM; Kumasi, Tamale and regional towns in 1–4 business days.</p>
                <p><b>Payments:</b> Cash on Delivery (Accra), Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo), bank transfer and card payments in store.</p>
                <p><b>Returns:</b> Easy 7-day returns policy — the product must be unused and in its original packaging. Boxed laptops carry their standard brand warranty.</p>
                <p><b>After Sale Service:</b> Call 0240 999979 / 0208 699 988 or visit our stores in Accra (Haatso), Kumasi (Asafo) or Tamale (Market).</p>
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-9" aria-label="Related products">
            <h2 className="text-[19px] md:text-[21px] font-extrabold text-[#232630] flex items-center gap-2.5 mb-4">
              <span className="w-1.5 h-6 bg-[var(--em-red)] rounded-full inline-block" /> Related products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {related.slice(0, 5).map((r) => <ProductCard key={r.id} p={r} compact />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
