/* Public order endpoint — validates every field server-side (zod) and computes
   all prices from the DB. Client-sent prices are never trusted. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/catalog-server";
import { sameOrigin } from "@/lib/admin-auth";
import { applyStockChange, StockError } from "@/lib/stock";
import { ensureLocations, locationForRegion } from "@/lib/locations";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  items: z
    .array(z.object({ id: z.number().int().positive(), qty: z.number().int().min(1).max(10) }))
    .min(1)
    .max(30),
  customer: z.object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    phone: z.string().trim().regex(/^0\d{9}$/, "Valid Ghana phone required"),
    email: z.string().trim().email().max(120).optional(),
    address: z.string().trim().min(5).max(160),
    city: z.string().trim().min(2).max(60),
    region: z.string().trim().min(2).max(60),
    notes: z.string().trim().max(500).optional(),
  }),
  payment: z.enum(["cod", "momo", "card"]),
});

function ghs(pesewas: number): string {
  return "GH\u20B5 " + (pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_WHATSAPP = "233240999979";

/** "0240 999979" / "+233 24 099 9979" → "233240999979"; null if not a Ghana mobile number. */
function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(d)) return `233${d.slice(1)}`;
  if (/^233\d{9}$/.test(d)) return d;
  return null;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin orders are not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }
    const { items, customer, payment } = parsed.data;

    await ensureSeeded();

    /* Resolve prices from the DB — never trust client prices */
    const ids = items.map((i) => i.id);
    const products = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE", stock: { gt: 0 } } });
    if (products.length === 0) {
      return NextResponse.json({ error: "Products unavailable" }, { status: 400 });
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines = items
      .filter((i) => byId.has(i.id))
      .map((i) => {
        const p = byId.get(i.id)!;
        return { productId: p.id, name: p.name, price: p.price, qty: i.qty };
      });
    if (lines.length === 0) {
      return NextResponse.json({ error: "Products unavailable" }, { status: 400 });
    }

    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const shipping = subtotal >= 100000 ? 0 : 5000; // pesewas: free delivery from GH₵ 1,000
    const total = subtotal + shipping;
    const ref = "CL-" + Math.floor(100000 + Math.random() * 900000);

    /* create the order and decrement stock atomically (rows locked, no overselling) */
    await ensureLocations();
    const order = await db.$transaction(async (tx) => {
      /* the shop serving the customer's region fulfils the order */
      const locationId = await locationForRegion(tx, customer.region);
      const created = await tx.order.create({
      data: {
        locationId,
        ref,
        customerName: `${customer.firstName} ${customer.lastName}`.slice(0, 120),
        phone: customer.phone,
        email: customer.email ?? null,
        address: customer.address,
        city: customer.city,
        region: customer.region,
        notes: customer.notes ?? null,
        payment: payment === "cod" ? "Cash on Delivery" : payment === "momo" ? "Mobile Money" : "Card",
        subtotal,
        shipping,
        total,
        items: { create: lines },
      },
      });
      for (const l of lines) {
        /* take stock from the fulfilling shop; if it doesn't have enough, from the shop with the most stock */
        let from = locationId;
        const here = await tx.productStock.findUnique({ where: { productId_locationId: { productId: l.productId, locationId } } });
        if (!here || here.quantity < l.qty) {
          const best = await tx.productStock.findFirst({
            where: { productId: l.productId, quantity: { gte: l.qty }, location: { active: true } },
            orderBy: { quantity: "desc" },
          });
          if (best) from = best.locationId;
        }
        await applyStockChange(tx, { productId: l.productId, locationId: from, type: "SALE", amount: l.qty, orderId: created.id, note: `Order ${created.ref}` });
      }
      return created;
    });

    /* WhatsApp of the shop fulfilling the order (falls back to the main line) */
    const shop = order.locationId ? await db.location.findUnique({ where: { id: order.locationId }, select: { name: true, phone: true } }) : null;
    return NextResponse.json({
      ref: order.ref,
      subtotal,
      shipping,
      total,
      items: lines.map((l) => ({ name: l.name, qty: l.qty, priceFmt: ghs(l.price * l.qty) })),
      shop: shop?.name ?? null,
      whatsapp: toWhatsAppNumber(shop?.phone) ?? DEFAULT_WHATSAPP,
    });
  } catch (e) {
    if (e instanceof StockError && e.code === "INSUFFICIENT") {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("order error", e);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
