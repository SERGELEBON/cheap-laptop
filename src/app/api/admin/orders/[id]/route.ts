/* Admin order update: status workflow (cancelling restores stock to the shops
   it was taken from) and reassignment to another shop. */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { ORDER_STATUSES, ORDER_TRANSITIONS, type OrderStatus } from "@/lib/rbac";
import { applyStockChange, StockError } from "@/lib/stock";
import { canAccessLocation } from "@/lib/locations";

export const dynamic = "force-dynamic";

const patchSchema = z.union([
  z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() }),
  z.object({ locationId: z.number().int().positive() }),
]);

/** Units of each product still taken from each shop for this order (SALE − CANCEL). */
async function heldStock(tx: Prisma.TransactionClient, orderId: number) {
  const mv = await tx.stockMovement.findMany({ where: { orderId, type: { in: ["SALE", "CANCEL"] } }, select: { productId: true, locationId: true, quantity: true } });
  const held = new Map<string, { productId: number; locationId: number; qty: number }>();
  for (const m of mv) {
    if (m.locationId == null) continue;
    const k = `${m.productId}:${m.locationId}`;
    const cur = held.get(k) ?? { productId: m.productId, locationId: m.locationId, qty: 0 };
    cur.qty += -m.quantity; // SALE is negative, CANCEL positive
    held.set(k, cur);
  }
  return [...held.values()].filter((h) => h.qty > 0);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireStaff("orders:update", req);
  if (!g.ok) return g.res;
  const oid = Number((await ctx.params).id);
  if (!Number.isInteger(oid) || oid <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: oid }, include: { items: true, location: true } });
      if (!order) return { error: "Order not found", status: 404 } as const;
      if (!canAccessLocation(g.staff, order.locationId)) return { error: "This order belongs to another location", status: 403 } as const;

      /* ---- reassign to another shop: move the reserved stock with it ---- */
      if ("locationId" in body) {
        if (!["pending", "processing"].includes(order.status)) return { error: "Only pending or processing orders can be reassigned", status: 409 } as const;
        if (body.locationId === order.locationId) return { order, summary: null } as const;
        const target = await tx.location.findUnique({ where: { id: body.locationId } });
        if (!target?.active) return { error: "Choose an active location", status: 409 } as const;
        for (const h of await heldStock(tx, order.id)) {
          await applyStockChange(tx, { productId: h.productId, locationId: h.locationId, type: "CANCEL", amount: h.qty, actorId: g.staff.id, orderId: order.id, note: `Order ${order.ref} moved to ${target.name}` });
          await applyStockChange(tx, { productId: h.productId, locationId: target.id, type: "SALE", amount: h.qty, actorId: g.staff.id, orderId: order.id, note: `Order ${order.ref} moved from ${order.location?.name ?? "—"}` });
        }
        const updated = await tx.order.update({ where: { id: oid }, data: { locationId: target.id } });
        return { order: updated, summary: `Order ${order.ref} reassigned: ${order.location?.name ?? "—"} → ${target.name}` } as const;
      }

      /* ---- status change ---- */
      const next = body.status;
      const from = order.status as OrderStatus;
      if (from === next) return { order, summary: null } as const;
      if (!ORDER_TRANSITIONS[from]?.includes(next)) return { error: `Can't move an order from "${from}" to "${next}"`, status: 409 } as const;
      if (next === "cancelled") {
        for (const h of await heldStock(tx, order.id)) {
          await applyStockChange(tx, { productId: h.productId, locationId: h.locationId, type: "CANCEL", amount: h.qty, actorId: g.staff.id, orderId: order.id, note: `Order ${order.ref} cancelled` });
        }
      }
      const updated = await tx.order.update({ where: { id: oid }, data: { status: next } });
      return { order: updated, summary: `Order ${order.ref}: ${from} → ${next}${"note" in body && body.note ? ` (${body.note})` : ""}` } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    if (result.summary) {
      await audit(g.staff, "locationId" in body ? "order.reassign" : "order.status", { entity: "Order", entityId: oid, summary: result.summary, ip: clientIp(req) });
    }
    return NextResponse.json({ ok: true, order: result.order });
  } catch (e) {
    if (e instanceof StockError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("order update", e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
