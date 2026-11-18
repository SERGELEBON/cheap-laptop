/* Admin order status update — enforces the order workflow and restores stock
   when an order is cancelled. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { ORDER_STATUSES, ORDER_TRANSITIONS, type OrderStatus } from "@/lib/rbac";
import { applyStockChange } from "@/lib/stock";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireStaff("orders:update", req);
  if (!g.ok) return g.res;
  const oid = Number((await ctx.params).id);
  if (!Number.isInteger(oid) || oid <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const next = parsed.data.status;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: oid }, include: { items: true } });
      if (!order) return { error: "Order not found", status: 404 } as const;
      const from = order.status as OrderStatus;
      if (from === next) return { order, from } as const;
      if (!ORDER_TRANSITIONS[from]?.includes(next)) {
        return { error: `Can't move an order from "${from}" to "${next}"`, status: 409 } as const;
      }
      if (next === "cancelled") {
        for (const it of order.items) {
          if (!it.productId) continue;
          const exists = await tx.product.findUnique({ where: { id: it.productId }, select: { id: true } });
          if (!exists) continue;
          await applyStockChange(tx, { productId: it.productId, type: "CANCEL", amount: it.qty, actorId: g.staff.id, orderId: order.id, note: `Order ${order.ref} cancelled` });
        }
      }
      const updated = await tx.order.update({ where: { id: oid }, data: { status: next } });
      return { order: updated, from } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    if (result.from !== next) {
      await audit(g.staff, "order.status", {
        entity: "Order", entityId: oid,
        summary: `Order ${result.order.ref}: ${result.from} → ${next}${parsed.data.note ? ` (${parsed.data.note})` : ""}`,
        details: { from: result.from, to: next }, ip: clientIp(req),
      });
    }
    return NextResponse.json({ ok: true, order: result.order });
  } catch (e) {
    console.error("order status", e);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
