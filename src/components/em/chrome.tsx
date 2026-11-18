"use client";
/* Site chrome: topbar marquee, header, mega menu, mobile drawer, mobile bottom nav, whatsapp float, footer */
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { MAIN_MENU, type Catalog, type MenuItem, type View } from "@/lib/types";
import { Search, Phone, User, Heart, ShoppingCart, Menu, X, ChevronDown, ChevronRight, MapPin, Home, LayoutGrid, BadgePercent, Truck, ShieldCheck, Headphones, Facebook, Instagram, Twitter, Send, MessageCircle } from "lucide-react";

export const MARQUEE_ITEMS = [
  "NOW OPEN — Home of Affordable Laptops & Computers",
  "FREE Bag & Mouse with Every Boxed Laptop",
  "Stores in Accra • Kumasi • Tamale",
  "Hotline: 0240 999979 / 0208 699 988",
  "Special Prices for Buyers & Dealers",
  "Luxury Electric Bikes & Scooters at our Accra Store — GH₵ 7k / 10k / 12k",
  "Nationwide Delivery Across Ghana",
  "Genuine Boxed Laptops Guaranteed",
];

function hashFor(item: MenuItem): string {
  switch (item.type) {
    case "cat": return `#/category/${item.slug}`;
    case "brand": return `#/brand/${item.slug}`;
    case "sale": return "#/shop?sale=1";
    case "page": return `#/page/${item.slug}`;
    default: return item.slug === "brands" ? "#/brands" : "#/shop";
  }
}

export function Topbar() {
  return (
    <div className="bg-[#15161a] text-white text-[12px]">
      <div className="max-w-[1250px] mx-auto px-3 flex items-center justify-between h-[38px]">
        <a href="tel:0240999979" className="flex items-center gap-2 hover:text-[var(--em-gold)] transition-colors">
          <Phone size={13} className="text-[var(--em-gold)]" />
          <span className="font-semibold">Hotline: 0240 999979 / 0208 699 988</span>
        </a>
        <a href="#/page/locations" className="hidden md:flex items-center gap-1.5 hover:text-[var(--em-gold)] transition-colors">
          <MapPin size={13} className="text-[var(--em-gold)]" /> Store Locations: Accra • Kumasi • Tamale
        </a>
      </div>
    </div>
  );
}

export function Marquee() {
  const text = MARQUEE_ITEMS.join("   |   ") + "   |   ";
  return (
    <div className="bg-[var(--em-red)] text-white text-[12px] font-medium overflow-hidden marquee-wrap">
      <div className="marquee whitespace-nowrap py-[7px]">{text + text}</div>
    </div>
  );
}

export function Header({ catalog }: { catalog: Catalog }) {
  const { view, cart, wishlist, navigate, cartTotalFmt } = useStore();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const active = view.name;

  const suggestions = useMemo(() => {
    if (q.trim().length < 2) return [];
    const n = q.toLowerCase();
    return catalog.products.filter((p) => p.name.toLowerCase().includes(n)).slice(0, 8);
  }, [q, catalog]);

  return (
    <header className="bg-white sticky top-0 z-40 shadow-[0_1px_8px_rgba(0,0,0,.08)]">
      <div className="max-w-[1250px] mx-auto px-3 py-3 flex items-center gap-4">
        <button className="lg:hidden p-1" onClick={() => setMobileOpen(true)} aria-label="Menu">
          <Menu size={26} />
        </button>
        <a href="#/" className="shrink-0" aria-label="Cheap Laptops Ghana">
          <img src="/images/cl/logo.svg" alt="Cheap Laptops — Home of Affordable Laptops & Computers" className="h-[44px] md:h-[52px] w-auto" />
        </a>
        <div className="hidden md:block relative flex-1 max-w-[620px]">
          <form
            className="flex border-2 border-[var(--em-red)] rounded-md overflow-hidden"
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) { navigate({ name: "search", q }); setQ(""); } }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products, brands and categories…"
              className="flex-1 px-4 py-[9px] text-[14px] outline-none"
              aria-label="Search"
            />
            <button type="submit" className="bg-[var(--em-red)] text-white px-5 flex items-center gap-2 text-sm font-semibold hover:bg-[#c00018] transition-colors">
              <Search size={17} /> <span className="hidden lg:inline">Search</span>
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg z-50 rounded-b-md">
              {suggestions.map((p) => (
                <a key={p.id} href={`#/product/${p.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b last:border-0" onClick={() => setQ("")}>
                  <div className="w-9 h-9 shrink-0 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                    {p.image ? <img src={p.image} alt="" className="max-h-full max-w-full object-contain" /> : <Search size={14} className="text-gray-300" />}
                  </div>
                  <span className="text-[13px] flex-1 line-clamp-1">{p.name}</span>
                  <span className="text-[13px] font-bold text-[var(--em-red)]">{p.priceFmt}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 md:gap-4">
          <a href="#/account" className={`hidden lg:flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 ${active === "account" ? "text-[var(--em-red)]" : ""}`}>
            <User size={20} />
            <span className="text-[13px] leading-tight font-medium">My<br />Account</span>
          </a>
          <a href="#/wishlist" className="relative hidden lg:flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
            <Heart size={20} />
            {wishlist.length > 0 && <span className="absolute -top-1 left-[26px] bg-[var(--em-red)] text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{wishlist.length}</span>}
            <span className="text-[13px] leading-tight font-medium">My<br />Wishlist</span>
          </a>
          <a href="#/cart" className="relative flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
            <span className="relative">
              <ShoppingCart size={22} />
              {count > 0 && <span className="absolute -top-2 -right-2 bg-[var(--em-red)] text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{count}</span>}
            </span>
            <span className="text-[13px] font-bold whitespace-nowrap">{cartTotalFmt()}</span>
          </a>
        </div>
      </div>
      {/* Mobile search */}
      <div className="md:hidden px-3 pb-3">
        <form
          className="flex border-2 border-[var(--em-red)] rounded-md overflow-hidden"
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) { navigate({ name: "search", q }); setQ(""); } }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="flex-1 px-3 py-2 text-sm outline-none" aria-label="Search" />
          <button type="submit" className="bg-[var(--em-red)] text-white px-4"><Search size={17} /></button>
        </form>
      </div>
      {/* Desktop nav */}
      <DesktopNav catalog={catalog} />
      <MobileDrawer catalog={catalog} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

function MenuLink({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  return <a href={hashFor(item)} onClick={onClick}>{item.label}</a>;
}

function DesktopNav({ catalog }: { catalog: Catalog }) {
  const [open, setOpen] = useState<string | null>(null);
  const valid = (item: MenuItem): boolean => {
    if (item.type === "cat") return !!catalog.categoriesBySlug[item.slug];
    if (item.type === "brand") return !!catalog.brandsBySlug[item.slug];
    return true;
  };
  return (
    <nav className="hidden lg:block border-t border-gray-100 bg-white relative" aria-label="Main">
      <div className="max-w-[1250px] mx-auto px-3 flex items-center">
        <div className="relative" onMouseLeave={() => setOpen(null)}>
          <button className="flex items-center gap-2 bg-[var(--em-red)] text-white px-6 py-[11px] text-[14px] font-bold rounded-t-md" onMouseEnter={() => setOpen("menu")}>
            <Menu size={18} /> MENU <ChevronDown size={14} />
          </button>
          {open === "menu" && (
            <div className="absolute top-full left-0 bg-white shadow-2xl border rounded-b-md w-[720px] grid grid-cols-5 z-50" onMouseEnter={() => setOpen("menu")}>
              {MAIN_MENU.map((group) => (
                <div key={group.label} className="p-4 border-r last:border-0">
                  <div className="text-[13px] font-bold mb-3 text-[#222]">{group.label}</div>
                  <ul className="space-y-2">
                    {group.items.filter(valid).map((item, i) => (
                      <li key={`${item.label}-${item.slug}-${i}`} className="text-[12.5px] text-gray-600 hover:text-[var(--em-red)]">
                        <MenuLink item={item} onClick={() => setOpen(null)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <ul className="flex items-center overflow-x-auto">
          {MAIN_MENU.map((group) => (
            <li key={group.label} className="relative" onMouseEnter={() => setOpen(group.label)} onMouseLeave={() => setOpen(null)}>
              <a href={hashFor(group.items[0])} className="block px-4 py-[11px] text-[13.5px] font-semibold text-[#232630] hover:text-[var(--em-red)] whitespace-nowrap border-b-2 border-transparent hover:border-[var(--em-red)] transition-colors">
                {group.label}
              </a>
              {open === group.label && (
                <div className="absolute top-full left-0 bg-white shadow-2xl border rounded-b-md min-w-[560px] grid grid-cols-3 z-50">
                  {group.items.filter(valid).map((item, i) => (
                    <div key={`${item.label}-${item.slug}-${i}`} className="p-4 border-r last:border-0">
                      <a href={hashFor(item)} onClick={() => setOpen(null)} className="text-[13px] font-bold text-[#222] hover:text-[var(--em-red)] block mb-2.5">{item.label}</a>
                      {item.children && (
                        <ul className="space-y-2">
                          {item.children.filter(valid).map((c, ci) => (
                            <li key={`${c.label}-${c.slug}-${ci}`} className="text-[12.5px] text-gray-600 hover:text-[var(--em-red)]">
                              <MenuLink item={c} onClick={() => setOpen(null)} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
          <li onMouseEnter={() => setOpen(null)}>
            <a href="#/shop?sale=1" className="block px-4 py-[11px] text-[13.5px] font-semibold text-[var(--em-red)] hover:opacity-80 whitespace-nowrap">Promo</a>
          </li>
        </ul>
        <div className="ml-auto hidden xl:flex items-center gap-4 text-[13px] font-medium text-gray-600">
          <a href="#/account" className="hover:text-[var(--em-red)]">My Account</a>
          <a href="#/page/customer-help" className="hover:text-[var(--em-red)]">FAQs</a>
          <a href="#/checkout" className="hover:text-[var(--em-red)]">Checkout</a>
          <span className="flex items-center gap-1.5 text-gray-400"><Phone size={13} /> 0240 999979</span>
        </div>
      </div>
    </nav>
  );
}

function MobileDrawer({ catalog, open, onClose }: { catalog: Catalog; open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const valid = (item: MenuItem): boolean => {
    if (item.type === "cat") return !!catalog.categoriesBySlug[item.slug];
    if (item.type === "brand") return !!catalog.brandsBySlug[item.slug];
    return true;
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-[86%] max-w-[380px] bg-white overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--em-red)] text-white sticky top-0 z-10">
          <img src="/images/cl/logo.svg" alt="Cheap Laptops" className="h-8 bg-white rounded px-1" />
          <button onClick={onClose} aria-label="Close menu"><X size={24} /></button>
        </div>
        <div className="py-2">
          <a href="#/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold border-b"><Home size={18} className="text-[var(--em-red)]" /> Home</a>
          {MAIN_MENU.map((group) => (
            <div key={group.label} className="border-b">
              <button className="w-full flex items-center justify-between px-4 py-3 font-semibold" onClick={() => setExpanded(expanded === group.label ? null : group.label)}>
                {group.label}
                {expanded === group.label ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {expanded === group.label && (
                <div className="pb-2 px-4 bg-gray-50">
                  {group.items.filter(valid).map((item, i) => (
                    <div key={`${item.label}-${item.slug}-${i}`} className="py-1.5">
                      <a href={hashFor(item)} onClick={onClose} className="block text-[13px] font-bold text-[#222] py-1">{item.label}</a>
                      {item.children && item.children.filter(valid).length > 0 && (
                        <ul className="pl-3 border-l-2 border-gray-200 space-y-1">
                          {item.children.filter(valid).map((c, ci) => (
                            <li key={`${c.label}-${c.slug}-${ci}`}>
                              <a href={hashFor(c)} onClick={onClose} className="block text-[12.5px] text-gray-600 py-1">{c.label}</a>
                              {c.children && c.children.filter(valid).length > 0 && (
                                <ul className="pl-3 space-y-1">
                                  {c.children.filter(valid).map((cc, cci) => (
                                    <li key={`${cc.label}-${cc.slug}-${cci}`}>
                                      <a href={hashFor(cc)} onClick={onClose} className="block text-[12px] text-gray-500 py-0.5">{cc.label}</a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a href="#/shop?sale=1" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold text-[var(--em-red)] border-b"><BadgePercent size={18} /> Promo</a>
          <a href="#/brands" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold border-b"><LayoutGrid size={18} className="text-[var(--em-red)]" /> All Brands</a>
          <a href="#/page/locations" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold border-b"><MapPin size={18} className="text-[var(--em-red)]" /> Store Locations</a>
          <a href="#/admin" onClick={onClose} className="hidden"><User size={18} /> Admin</a>
          <a href="#/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold border-b"><User size={18} className="text-[var(--em-red)]" /> My Account</a>
          <a href="#/page/customer-help" onClick={onClose} className="flex items-center gap-3 px-4 py-3 font-semibold border-b">FAQs</a>
        </div>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const { cart } = useStore();
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const item = "flex flex-col items-center gap-0.5 py-1.5 flex-1 text-[10.5px] font-medium text-gray-600";
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,.06)] z-40 pb-[env(safe-area-inset-bottom)]" aria-label="Mobile">
      <div className="flex">
        <a href="#/" className={item}><Home size={19} /> Home</a>
        <a href="#/categories" className={item}><LayoutGrid size={19} /> Categories</a>
        <a href="#/brands" className={item}><BadgePercent size={19} /> Brand</a>
        <a href="#/cart" className={`${item} relative`}>
          <ShoppingCart size={19} /> Cart
          {count > 0 && <span className="absolute top-0 right-[22%] bg-[var(--em-red)] text-white text-[9px] rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">{count}</span>}
        </a>
        <a href="#/account" className={item}><User size={19} /> Profile</a>
      </div>
    </nav>
  );
}

export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/233240999979"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-16 lg:bottom-6 left-4 z-40 bg-[#25d366] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="WhatsApp Chat"
    >
      <MessageCircle size={24} />
    </a>
  );
}

export function FeaturesStrip() {
  const items = [
    { icon: Truck, title: "Nationwide Delivery", sub: "We Deliver Across Ghana" },
    { icon: ShieldCheck, title: "Genuine Boxed Laptops", sub: "FREE Bag & Mouse Promo" },
    { icon: BadgePercent, title: "Dealer Prices", sub: "For Buyers & Intermediaries" },
    { icon: Headphones, title: "After Sale Service", sub: "Call: 0240 999979" },
  ];
  return (
    <div className="border-y bg-white">
      <div className="max-w-[1250px] mx-auto px-3 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((f) => (
          <div key={f.title} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#fdecef] flex items-center justify-center shrink-0">
              <f.icon size={22} className="text-[var(--em-red)]" />
            </div>
            <div>
              <div className="font-bold text-[14px] text-[#222]">{f.title}</div>
              <div className="text-[12px] text-gray-500">{f.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FOOTER_COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#/page/about-us" },
      { label: "Contact Us", href: "#/page/contact-us" },
      { label: "Privacy Policy", href: "#/page/privacy-policy" },
      { label: "Terms & Conditions", href: "#/page/terms-conditions" },
      { label: "FAQs", href: "#/page/customer-help" },
    ],
  },
  {
    title: "ORDERS",
    links: [
      { label: "Delivery Information", href: "#/page/delivery-information" },
      { label: "Return Policy", href: "#/page/return-policy" },
      { label: "How It Works", href: "#/page/how-it-works" },
      { label: "Payment Options", href: "#/page/payment-options" },
      { label: "Feedback", href: "#/page/feedback" },
    ],
  },
  {
    title: "SUPPORT",
    links: [
      { label: "Wholesale & Dealers", href: "#/page/wholesale-dealers" },
      { label: "Our Stores", href: "#/page/locations" },
      { label: "After Sales Service", href: "#/page/after-sales-service" },
      { label: "Brands", href: "#/brands" },
      { label: "Product Categories", href: "#/categories" },
    ],
  },
  {
    title: "CUSTOMER",
    links: [
      { label: "Account", href: "#/account" },
      { label: "Order History", href: "#/account" },
      { label: "Admin Dashboard", href: "#/admin" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-[#15161a] text-white">
      <div className="max-w-[1250px] mx-auto px-3 pt-12 pb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wide">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-[13px] text-gray-400 hover:text-[var(--em-red)] transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wide">SUBSCRIBE</h4>
          <div className="flex items-center gap-2 mb-5">
            {[
              { icon: Facebook, label: "Facebook" },
              { icon: Instagram, label: "Instagram" },
              { icon: Twitter, label: "Twitter (X)" },
              { icon: Send, label: "Telegram — CHEAP LAPTOPS COMPANY" },
            ].map((s) => (
              <a key={s.label} href="#/" aria-label={s.label} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--em-red)] transition-colors">
                <s.icon size={16} />
              </a>
            ))}
          </div>
          <div className="space-y-2.5 text-[13px] text-gray-300">
            <div className="flex items-center gap-2"><Phone size={14} className="text-[var(--em-gold)] shrink-0" /> <a href="tel:0240999979" className="hover:text-white">0240 999979</a><span className="text-gray-500">/</span><a href="tel:02086999988" className="hover:text-white">0208 699 988</a></div>
            <div className="flex items-center gap-2"><MessageCircle size={14} className="text-[var(--em-gold)] shrink-0" /> <a href="https://wa.me/233240999979" target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp: 0240 999979</a></div>
            <div className="flex items-center gap-2"><MapPin size={14} className="text-[var(--em-gold)] shrink-0" /> Accra (Haatso) • Kumasi (Asafo) • Tamale (Market)</div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1250px] mx-auto px-3 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[12.5px] text-gray-400">
          <span>Copyright © 2025 Cheap Laptops Ghana — Home of Affordable Laptops &amp; Computers. All Rights Reserved.</span>
          <span className="flex items-center gap-3 text-gray-500">
            <span className="bg-white/10 rounded px-2 py-1 text-[11px]">Cash on Delivery</span>
            <span className="bg-white/10 rounded px-2 py-1 text-[11px]">Mobile Money</span>
            <span className="bg-white/10 rounded px-2 py-1 text-[11px]">Visa / Mastercard</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-md shadow-lg text-white text-[13px] font-medium max-w-[320px] ${t.kind === "err" ? "bg-red-600" : t.kind === "info" ? "bg-gray-800" : "bg-[#1e9e4a]"}`}
          onClick={() => dismissToast(t.id)}
          role="status"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <div className="bg-[#f7f7f7] border-b">
      <div className="max-w-[1250px] mx-auto px-3 py-3 flex items-center flex-wrap gap-1.5 text-[12.5px] text-gray-500">
        <a href="#/" className="hover:text-[var(--em-red)]">Home</a>
        {trail.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight size={12} />
            {t.href ? <a href={t.href} className="hover:text-[var(--em-red)]">{t.label}</a> : <span className="text-[#222] font-medium">{t.label}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function useHashRouter() {
  const navigate = useStore((s) => s.navigate);
  useEffect(() => {
    const parse = (): View => {
      const h = window.location.hash.replace(/^#\/?/, "");
      if (!h) return { name: "home" };
      const [path, query] = h.split("?");
      const parts = path.split("/").filter(Boolean);
      const q = Object.fromEntries(new URLSearchParams(query || ""));
      if (parts[0] === "category" && parts[1]) return { name: "category", slug: parts.slice(1).join("/") };
      if (parts[0] === "product" && parts[1]) return { name: "product", slug: parts[1] };
      if (parts[0] === "brand" && parts[1]) return { name: "brand", slug: parts[1] };
      if (parts[0] === "shop") return { name: "shop", sale: q.sale === "1" };
      if (parts[0] === "search") return { name: "search", q: q.q || "" };
      if (parts[0] === "cart") return { name: "cart" };
      if (parts[0] === "checkout") return { name: "checkout" };
      if (parts[0] === "order-success") return { name: "order-success", orderId: q.id || "CL-" + Date.now() };
      if (parts[0] === "wishlist") return { name: "wishlist" };
      if (parts[0] === "account") return { name: "account" };
      if (parts[0] === "admin") return { name: "admin" };
      if (parts[0] === "categories") return { name: "page", slug: "product-categories" };
      if (parts[0] === "brands") return { name: "page", slug: "brands" };
      if (parts[0] === "page" && parts[1]) return { name: "page", slug: parts.slice(1).join("/") };
      return { name: "home" };
    };
    const apply = () => navigate(parse());
    if (!window.location.hash) window.location.hash = "#/";
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
}
