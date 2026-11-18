"use client";
/* Cheap Laptops Ghana — single-page app shell */
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Catalog } from "@/lib/types";
import { Header, Footer, Topbar, Marquee, MobileBottomNav, WhatsAppFloat, Toasts, FeaturesStrip, useHashRouter } from "@/components/em/chrome";
import { HomeView } from "@/components/em/home";
import { CategoryView, BrandView, SearchView, ShopView, CategoriesIndex, BrandsIndex } from "@/components/em/shop";
import { ProductView } from "@/components/em/product";
import { CartView, CheckoutView, OrderSuccessView, WishlistView, AccountView } from "@/components/em/cart";
import { StaticPageView } from "@/components/em/pages";
import { AdminApp } from "@/components/em/admin";

let cache: Catalog | null = null;

export default function Page() {
  const view = useStore((s) => s.view);
  useHashRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(cache);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache) return;
    setLoadError(false);
    fetch("/api/catalog")
      .then((r) => {
        if (!r.ok) throw new Error(`catalog HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Catalog) => {
        // build lookup maps
        data.categoriesBySlug = Object.fromEntries(data.categories.map((c) => [c.slug, c]));
        data.productsBySlug = Object.fromEntries(data.products.map((p) => [p.slug, p]));
        data.brandsBySlug = Object.fromEntries(data.brands.map((b) => [b.slug, b]));
        data.pagesBySlug = Object.fromEntries(data.pages.map((p) => [p.slug, p]));
        cache = data;
        setCatalog(data);
      })
      .catch((e) => {
        console.error("catalog load failed", e);
        setLoadError(true);
      });
  }, [attempt]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-foreground">
      <Topbar />
      <Marquee />
      {catalog ? (
        <>
          <Header catalog={catalog} />
          <main className="flex-1 pb-14 lg:pb-0">
            <Body catalog={catalog} view={view} />
          </main>
          {view.name !== "home" && <FeaturesStrip />}
          <Footer />
        </>
      ) : (
        <Splash error={loadError} onRetry={() => setAttempt((a) => a + 1)} />
      )}
      <MobileBottomNav />
      <WhatsAppFloat />
      <Toasts />
    </div>
  );
}

function Splash({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
      <img src="/images/cl/logo.svg" alt="Cheap Laptops Ghana" className="h-12" />
      {error ? (
        <div className="flex flex-col items-center gap-3 text-sm text-gray-600">
          <p>We couldn&apos;t load the store. Please check your connection.</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-md bg-[var(--em-red)] text-white font-semibold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="w-7 h-7 border-3 border-[var(--em-red)] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      )}
    </div>
  );
}

function Body({ catalog, view }: { catalog: Catalog; view: ReturnType<typeof useStore.getState>["view"] }) {
  switch (view.name) {
    case "home": return <HomeView catalog={catalog} />;
    case "category": return <CategoryView catalog={catalog} slug={view.slug} />;
    case "product": return <ProductView catalog={catalog} slug={view.slug} />;
    case "brand": return <BrandView catalog={catalog} slug={view.slug} />;
    case "shop": return <ShopView catalog={catalog} sale={view.sale} />;
    case "search": return <SearchView catalog={catalog} q={view.q} />;
    case "cart": return <CartView />;
    case "checkout": return <CheckoutView />;
    case "order-success": return <OrderSuccessView orderId={view.orderId} />;
    case "wishlist": return <WishlistView catalog={catalog} />;
    case "account": return <AccountView />;
    case "admin": return <AdminApp />;
    case "page": return <StaticPageView catalog={catalog} slug={view.slug} />;
    default: return <HomeView catalog={catalog} />;
  }
}
