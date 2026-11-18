"use client";
/* Global state: router + cart + wishlist + orders + toasts (persisted) */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, View } from "./types";

export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "info" | "err";
}

interface Order {
  id: string;
  date: string;
  total: number;
  totalFmt: string;
  lines: { name: string; qty: number; priceFmt: string }[];
  payment: string;
  name: string;
}

interface State {
  view: View;
  toasts: Toast[];
  cart: CartLine[];
  wishlist: number[];
  orders: Order[];
  lastOrder: Order | null;
  navigate: (v: View) => void;
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  addToCart: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  toggleWish: (id: number, name?: string) => void;
  placeOrder: (o: Order) => void;
  cartCount: () => number;
  cartTotalFmt: () => string;
}

function fmt(n: number) {
  return "GH\u20B5 " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let toastId = 1;

function viewToHash(v: View): string {
  switch (v.name) {
    case "home": return "#/";
    case "category": return `#/category/${v.slug}`;
    case "product": return `#/product/${v.slug}`;
    case "brand": return `#/brand/${v.slug}`;
    case "shop": return v.sale ? "#/shop?sale=1" : "#/shop";
    case "search": return `#/search?q=${encodeURIComponent(v.q)}`;
    case "cart": return "#/cart";
    case "checkout": return "#/checkout";
    case "order-success": return `#/order-success?id=${v.orderId}`;
    case "wishlist": return "#/wishlist";
    case "account": return "#/account";
    case "admin": return "#/admin";
    case "page": return `#/page/${v.slug}`;
    default: return "#/";
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      view: { name: "home" },
      toasts: [],
      cart: [],
      wishlist: [],
      orders: [],
      lastOrder: null,
      navigate: (v) => {
        set({ view: v });
        const h = viewToHash(v);
        /* the admin app owns its own sub-routes (#/admin/products, #/admin/invite/…) — don't collapse them */
        const keepAdminRoute = v.name === "admin" && typeof window !== "undefined" && window.location.hash.startsWith("#/admin");
        if (typeof window !== "undefined" && !keepAdminRoute && window.location.hash !== h) {
          window.location.hash = h;
        }
        window.scrollTo({ top: 0 });
      },
      toast: (msg, kind = "ok") => {
        const id = toastId++;
        set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      addToCart: (line, qty = 1) => {
        const cart = [...get().cart];
        const i = cart.findIndex((c) => c.id === line.id);
        if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + qty };
        else cart.push({ ...line, qty });
        set({ cart });
        get().toast(`Added "${line.name.slice(0, 40)}${line.name.length > 40 ? "\u2026" : ""}" to cart`);
      },
      setQty: (id, qty) => {
        if (qty < 1) return;
        set({ cart: get().cart.map((c) => (c.id === id ? { ...c, qty } : c)) });
      },
      removeFromCart: (id) => set({ cart: get().cart.filter((c) => c.id !== id) }),
      clearCart: () => set({ cart: [] }),
      toggleWish: (id, name) => {
        const w = get().wishlist;
        if (w.includes(id)) {
          set({ wishlist: w.filter((x) => x !== id) });
          get().toast("Removed from wishlist", "info");
        } else {
          set({ wishlist: [...w, id] });
          get().toast(`Added "${name || "Product"}" to wishlist`);
        }
      },
      placeOrder: (o) => set({ orders: [o, ...get().orders], lastOrder: o }),
      cartCount: () => get().cart.reduce((a, c) => a + c.qty, 0),
      cartTotalFmt: () => fmt(get().cart.reduce((a, c) => a + c.price * c.qty, 0)),
    }),
    {
      name: "em-clone",
      partialize: (s) => ({ cart: s.cart, wishlist: s.wishlist, orders: s.orders }) as Partial<State>,
    }
  )
);

export { fmt as money };
