"use client";
/* Cart, checkout, order success, wishlist, account views */
import { useMemo, useState } from "react";
import { useStore, money } from "@/lib/store";
import type { Catalog } from "@/lib/types";
import { ProductCard } from "./cards";
import { Breadcrumb } from "./chrome";
import { Trash2, ShoppingCart, Heart, CreditCard, Banknote, Smartphone, Ticket, CheckCircle2, PackageSearch, Lock, User, Package } from "lucide-react";

/* ---------------- Cart ---------------- */
export function CartView() {
  const { cart, setQty, removeFromCart, navigate, clearCart, toast } = useStore();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; pct: number } | null>(null);
  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const discountAmt = applied ? subtotal * applied.pct : 0;
  const shipping = cart.length === 0 ? 0 : subtotal >= 1000 ? 0 : 50;
  const total = subtotal - discountAmt + shipping;

  if (cart.length === 0) {
    return (
      <div className="max-w-[1250px] mx-auto px-3 py-16 text-center">
        <ShoppingCart size={46} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Your cart is currently empty</h1>
        <p className="text-gray-500 text-[14px] mt-2">Browse our deals and add products to your cart.</p>
        <a href="#/shop" className="inline-block mt-5 bg-[var(--em-red)] text-white font-bold text-[14px] px-7 py-3 rounded hover:bg-[var(--em-red-dark)]">Return to shop</a>
      </div>
    );
  }
  return (
    <div>
      <Breadcrumb trail={[{ label: "Cart" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5">Cart</h1>
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-[#f7f7f8] text-gray-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Product</th>
                  <th className="text-center font-semibold px-2 py-3 hidden sm:table-cell">Price</th>
                  <th className="text-center font-semibold px-2 py-3">Qty</th>
                  <th className="text-right font-semibold px-4 py-3">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {cart.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <a href={`#/product/${c.slug}`} className="flex items-center gap-3 group">
                        <div className="w-14 h-14 border rounded flex items-center justify-center shrink-0 overflow-hidden bg-white">
                          {c.image ? <img src={c.image} alt="" className="max-h-full max-w-full object-contain" /> : null}
                        </div>
                        <span className="font-semibold text-[#232630] group-hover:text-[var(--em-red)] line-clamp-2 max-w-[280px]">{c.name}</span>
                      </a>
                    </td>
                    <td className="text-center px-2 py-3 hidden sm:table-cell text-gray-600">{c.priceFmt}</td>
                    <td className="text-center px-2 py-3">
                      <div className="inline-flex items-center border rounded overflow-hidden">
                        <button onClick={() => setQty(c.id, c.qty - 1)} className="px-2.5 py-1.5 hover:bg-gray-50" aria-label="Decrease quantity">−</button>
                        <span className="px-3 font-bold w-9">{c.qty}</span>
                        <button onClick={() => setQty(c.id, c.qty + 1)} className="px-2.5 py-1.5 hover:bg-gray-50" aria-label="Increase quantity">+</button>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-[var(--em-red)]">{money(c.price * c.qty)}</td>
                    <td className="px-2">
                      <button onClick={() => removeFromCart(c.id)} className="text-gray-400 hover:text-[var(--em-red)]" aria-label="Remove this item"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t px-4 py-3 flex gap-2 flex-wrap items-center">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="border rounded px-3 py-2 text-[13px] w-[180px] outline-none focus:border-[var(--em-red)]" />
              <button
                onClick={() => {
                  const code = coupon.trim().toUpperCase();
                  if (code === "NOWOPEN10") { setApplied({ code, pct: 0.1 }); toast("Coupon applied: 10% off"); }
                  else toast("Invalid coupon code", "err");
                }}
                className="bg-[#232630] text-white font-bold text-[13px] px-4 py-2 rounded hover:bg-black flex items-center gap-1.5"
              >
                <Ticket size={14} /> Apply coupon
              </button>
              <button onClick={() => { clearCart(); toast("Cart cleared", "info"); }} className="text-[13px] text-gray-500 hover:text-[var(--em-red)] ml-auto">Empty cart</button>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5 space-y-3">
            <h2 className="font-bold text-[15px] text-[#232630]">Cart totals</h2>
            <div className="flex justify-between text-[13.5px] py-1.5 border-b"><span className="text-gray-500">Subtotal</span><span className="font-bold">{money(subtotal)}</span></div>
            {applied && <div className="flex justify-between text-[13.5px] py-1.5 border-b text-[#1e9e4a]"><span>Coupon ({applied.code})</span><span className="font-bold">−{money(discountAmt)}</span></div>}
            <div className="flex justify-between text-[13.5px] py-1.5 border-b"><span className="text-gray-500">Shipping</span><span className="font-bold">{shipping === 0 ? "Free" : money(shipping)}</span></div>
            <div className="flex justify-between text-[15px] py-2"><span className="font-bold text-[#232630]">Total</span><span className="font-black text-[var(--em-red)] text-lg">{money(total)}</span></div>
            <button onClick={() => navigate({ name: "checkout" })} className="w-full bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white font-bold py-3 rounded transition-colors">
              Proceed to checkout
            </button>
            <a href="#/shop" className="block text-center text-[13px] font-semibold text-gray-500 hover:text-[var(--em-red)]">← Continue shopping</a>
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Lock size={12} /> Free delivery on orders from GH₵ 1,000</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReqStar() {
  return <span className="text-[var(--em-red)]">*</span>;
}

/* ---------------- Checkout ---------------- */
export function CheckoutView() {
  const { cart, navigate, placeOrder, clearCart, toast } = useStore();
  const [pay, setPay] = useState<"cod" | "momo" | "card">("cod");
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "", city: "Accra", region: "Greater Accra", notes: "" });
  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const shipping = cart.length === 0 ? 0 : subtotal >= 1000 ? 0 : 50;
  const total = subtotal + shipping;

  if (cart.length === 0) {
    return (
      <div className="max-w-[1250px] mx-auto px-3 py-16 text-center">
        <ShoppingCart size={46} className="mx-auto text-gray-300" />
        <h1 className="text-xl font-bold mt-4">Your cart is empty</h1>
        <a href="#/shop" className="inline-block mt-5 bg-[var(--em-red)] text-white font-bold text-[14px] px-7 py-3 rounded hover:bg-[var(--em-red-dark)]">Return to shop</a>
      </div>
    );
  }

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast("Please fill in the required billing fields", "err");
      return;
    }
    if (!/^0\d{9}$/.test(form.phone.trim())) {
      toast("Enter a valid Ghana phone number (e.g. 0240999979)", "err");
      return;
    }
    setPlacing(true);
    const payLabel = pay === "cod" ? "Cash on Delivery" : pay === "momo" ? "Mobile Money" : "Card";
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ id: c.id, qty: c.qty })),
          customer: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || undefined,
            address: form.address.trim(),
            city: form.city.trim() || "Accra",
            region: form.region,
            notes: form.notes.trim() || undefined,
          },
          payment: pay,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ref) throw new Error(data?.error || "Order failed");
      placeOrder({
        id: data.ref,
        date: new Date().toLocaleString("en-GB"),
        total: data.total,
        totalFmt: money(data.total),
        lines: data.items.map((it: { name: string; qty: number; priceFmt: string }) => ({ name: it.name, qty: it.qty, priceFmt: it.priceFmt })),
        payment: payLabel,
        name: `${form.firstName} ${form.lastName}`,
      });
      clearCart();
      navigate({ name: "order-success", orderId: data.ref });
    } catch (e) {
      /* Never fake a successful order: the shop would never receive it. */
      toast(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "We couldn't place your order. Please check your connection and try again, or call 0240 999979.", "err");
    } finally {
      setPlacing(false);
    }
  };

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <Breadcrumb trail={[{ label: "Cart", href: "#/cart" }, { label: "Checkout" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5">Checkout</h1>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-5">
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-[15px] text-[#232630] mb-4">Billing details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  ["firstName", "First name", true], ["lastName", "Last name", true],
                  ["phone", "Phone", true], ["email", "Email address", false],
                ] as const).map(([k, label, r]) => (
                  <label key={k} className="block">
                    <span className="text-[12.5px] font-semibold text-gray-600">{label} {r && <ReqStar />}</span>
                    <input
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]"
                    />
                  </label>
                ))}
                <label className="block sm:col-span-2">
                  <span className="text-[12.5px] font-semibold text-gray-600">Street address <ReqStar /></span>
                  <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House number and street name" className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
                </label>
                <label className="block">
                  <span className="text-[12.5px] font-semibold text-gray-600">Town / City <ReqStar /></span>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
                </label>
                <label className="block">
                  <span className="text-[12.5px] font-semibold text-gray-600">Region</span>
                  <select value={form.region} onChange={(e) => set("region", e.target.value)} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none bg-white">
                    {["Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta", "Northern", "Upper East", "Upper West", "Bono", "Ahafo"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12.5px] font-semibold text-gray-600">Order notes (optional)</span>
                  <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" placeholder="Notes about your order, e.g. special notes for delivery." />
                </label>
              </div>
            </div>
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-[15px] text-[#232630] mb-4">Payment method</h2>
              <div className="space-y-2.5">
                {([
                  ["cod", "Cash on Delivery", "Pay with cash upon delivery (available in Accra)", Banknote],
                  ["momo", "Mobile Money", "MTN MoMo / Telecel Cash / AirtelTigo Money", Smartphone],
                  ["card", "Credit / Debit Card", "Secure payment — Visa & Mastercard", CreditCard],
                ] as const).map(([k, label, sub, Icon]) => (
                  <label key={k} className={`flex items-start gap-3 border rounded-md p-3.5 cursor-pointer ${pay === k ? "border-[var(--em-red)] bg-[#f2f6ff]" : ""}`}>
                    <input type="radio" checked={pay === k} onChange={() => setPay(k)} className="mt-1 accent-[var(--em-red)]" />
                    <Icon size={18} className="mt-0.5 text-[var(--em-red)]" />
                    <span>
                      <span className="block font-bold text-[13.5px] text-[#232630]">{label}</span>
                      <span className="block text-[12px] text-gray-500">{sub}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5 lg:sticky lg:top-[180px]">
            <h2 className="font-bold text-[15px] text-[#232630] mb-4">Your order</h2>
            <ul className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
              {cart.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 text-[13px] border-b pb-2.5 last:border-0">
                  <span className="text-gray-600 flex-1">{c.name} <b className="text-[#232630]">× {c.qty}</b></span>
                  <span className="font-bold whitespace-nowrap">{money(c.price * c.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 text-[13.5px]">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Subtotal</span><span className="font-bold">{money(subtotal)}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Shipping</span><span className="font-bold">{shipping === 0 ? "Free" : money(shipping)}</span></div>
              <div className="flex justify-between py-1.5"><span className="font-bold text-[#232630]">Total</span><span className="font-black text-[var(--em-red)] text-lg">{money(total)}</span></div>
            </div>
            <button onClick={submit} disabled={placing} className="mt-3 w-full bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white font-bold py-3.5 rounded transition-colors disabled:opacity-60">
              {placing ? "Placing order…" : "Place order"}
            </button>
            <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5"><Lock size={12} /> Your personal data will be used to process your order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Order success ---------------- */
export function OrderSuccessView({ orderId }: { orderId: string }) {
  const { lastOrder } = useStore();
  const o = lastOrder;
  return (
    <div className="max-w-[760px] mx-auto px-3 py-14">
      <div className="bg-white border rounded-lg p-8 text-center">
        <CheckCircle2 size={56} className="mx-auto text-[#1e9e4a]" />
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mt-4">Thank you. Your order has been received.</h1>
        <p className="text-gray-500 text-[13.5px] mt-2">Order number: <b className="text-[#232630]">{orderId}</b></p>
        {o && (
          <div className="mt-6 text-left border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#f7f7f8] text-[12.5px]">
              {[["Order", o.id], ["Date", o.date], ["Payment", o.payment], ["Total", o.totalFmt]].map(([k, v]) => (
                <div key={k} className="p-3 border-r last:border-0">
                  <div className="text-gray-400 text-[11px]">{k}</div>
                  <div className="font-bold text-[#232630] mt-0.5 break-all">{v}</div>
                </div>
              ))}
            </div>
            <ul className="divide-y text-[13.5px]">
              {o.lines.map((l, i) => (
                <li key={i} className="flex justify-between px-4 py-3">
                  <span className="text-gray-600">{l.name} × {l.qty}</span>
                  <span className="font-bold">{l.priceFmt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <a href="#/shop" className="bg-[var(--em-red)] text-white font-bold text-[14px] px-6 py-3 rounded hover:bg-[var(--em-red-dark)]">Continue shopping</a>
          <a href="#/account" className="border-2 border-[#232630] text-[#232630] font-bold text-[14px] px-6 py-[10px] rounded hover:bg-[#232630] hover:text-white">View order history</a>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Wishlist ---------------- */
export function WishlistView({ catalog }: { catalog: Catalog }) {
  const { wishlist } = useStore();
  const products = useMemo(() => catalog.products.filter((p) => wishlist.includes(p.id)), [catalog, wishlist]);
  return (
    <div>
      <Breadcrumb trail={[{ label: "Wishlist" }]} />
      <div className="max-w-[1250px] mx-auto px-3 py-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-[#232630] mb-5 flex items-center gap-3"><Heart size={22} className="text-[var(--em-red)]" /> My wishlist</h1>
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={46} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-4">Your wishlist is empty. Tap the heart on any product to save it here.</p>
            <a href="#/shop" className="inline-block mt-4 text-[var(--em-red)] font-semibold">Browse products →</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => <ProductCard key={p.id} p={p} compact />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Account ---------------- */
export function AccountView() {
  const { orders } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [logged, setLogged] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", pass: "" });

  if (logged) {
    return (
      <div>
        <Breadcrumb trail={[{ label: "My Account" }]} />
        <div className="max-w-[1000px] mx-auto px-3 py-6 grid lg:grid-cols-[240px_1fr] gap-6 items-start">
          <aside className="bg-white border rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-3 pb-3 border-b mb-2">
              <div className="w-10 h-10 rounded-full bg-[var(--em-red)] text-white flex items-center justify-center font-bold">{logged.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="font-bold text-[14px] text-[#232630]">{logged}</div>
                <div className="text-[11px] text-gray-400">Customer</div>
              </div>
            </div>
            {[{ l: "Orders", I: Package }, { l: "Addresses", I: User }, { l: "Account details", I: User }, { l: "Logout", I: User }].map(({ l, I }, i) => (
              <button key={l} onClick={() => { if (l === "Logout") { setLogged(null); } }} className={`w-full text-left px-3 py-2 rounded text-[13.5px] font-medium flex items-center gap-2.5 ${i === 0 ? "bg-[#f2f6ff] text-[var(--em-red)]" : "text-gray-600 hover:bg-gray-50"}`}>
                <I size={15} /> {l}
              </button>
            ))}
          </aside>
          <div className="bg-white border rounded-lg p-6">
            <h1 className="font-bold text-[17px] text-[#232630] mb-4">Order history</h1>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-[14px]">No orders have been placed yet.</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#f7f7f8] text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Order</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Payment</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-2.5 font-bold text-[var(--em-red)]">#{o.id}</td>
                        <td className="px-4 py-2.5 text-gray-600">{o.date}</td>
                        <td className="px-4 py-2.5 text-gray-600">{o.payment}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{o.totalFmt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb trail={[{ label: "My Account" }]} />
      <div className="max-w-[440px] mx-auto px-3 py-10">
        <div className="bg-white border rounded-lg p-7">
          <div className="flex gap-2 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 rounded font-bold text-[13.5px] ${mode === m ? "bg-[var(--em-red)] text-white" : "bg-gray-100 text-gray-500"}`}>
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>
          {mode === "register" && (
            <label className="block mb-3">
              <span className="text-[12.5px] font-semibold text-gray-600">Full name <span className="text-[var(--em-red)]">*</span></span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
            </label>
          )}
          <label className="block mb-3">
            <span className="text-[12.5px] font-semibold text-gray-600">Email or username <span className="text-[var(--em-red)]">*</span></span>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
          </label>
          <label className="block mb-4">
            <span className="text-[12.5px] font-semibold text-gray-600">Password <span className="text-[var(--em-red)]">*</span></span>
            <input type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} className="mt-1 w-full border rounded px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--em-red)]" />
          </label>
          <button
            onClick={() => {
              if (!form.email || !form.pass) return;
              setLogged(form.name || form.email.split("@")[0] || "Customer");
            }}
            className="w-full bg-[var(--em-red)] hover:bg-[var(--em-red-dark)] text-white font-bold py-3 rounded transition-colors"
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="text-[11px] text-gray-400 mt-3 text-center">Demo account — data is stored locally in your browser.</p>
        </div>
      </div>
    </div>
  );
}
