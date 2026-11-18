/* Stock adjustment for one product: restock, return, damage, loss, or count. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { STOCK_ADJUST_TYPES, STOCK_TYPE_INFO } from "@/lib/rbac";
import { applyStockChange, StockError } from "@/lib/stock";
import { canAccessLocation, ensureLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    type: z.enum(STOCK_ADJUST_TYPES),
    locationId: z.number().int().positive(),
    quantity: z.number().int().min(0).max(100000),
    note: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.type === "COUNT" || d.quantity > 0, { message: "Quantity must be at least 1" })
  .refine((d) => !["DAMAGE", "LOSS", "COUNT"].includes(d.type) || (d.note && d.note.length >= 3), {
    message: "A reason is required for damage, loss and count corrections",
  });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireStaff("stock:adjust", req);
  if (!g.ok) return g.res;
  const productId = Number((await ctx.params).id);
  if (!Number.isInteger(productId) || productId <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid adjustment" }, { status: 400 });
  const { type, quantity, note, locationId } = parsed.data;
  if (!canAccessLocation(g.staff, locationId)) {
    return NextResponse.json({ error: "You can only adjust stock at your own location" }, { status: 403 });
  }

  try {
    await ensureLocations();
    const r = await db.$transaction((tx) => applyStockChange(tx, { productId, locationId, type, amount: quantity, actorId: g.staff.id, note }));
    await audit(g.staff, "stock.adjust", {
      entity: "Product", entityId: productId,
      summary: `${STOCK_TYPE_INFO[type].label} at ${r.locationName}: "${r.name}" ${r.before} → ${r.after}${note ? ` (${note})` : ""}`,
      details: { type, quantity, locationId, before: r.before, after: r.after, note: note ?? null }, ip: clientIp(req),
    });
    return NextResponse.json({ ok: true, stock: r.after, movement: r.movement });
  } catch (e) {
    if (e instanceof StockError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    console.error("stock adjust", e);
    return NextResponse.json({ error: "Failed to adjust stock" }, { status: 500 });
  }
}
