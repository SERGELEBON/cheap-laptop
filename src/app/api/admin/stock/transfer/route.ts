/* Transfer stock of one product between two locations. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { canAccessLocation, ensureLocations } from "@/lib/locations";
import { StockError, transferStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.number().int().positive(),
  fromId: z.number().int().positive(),
  toId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100000),
  note: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const g = await requireStaff("stock:adjust", req);
  if (!g.ok) return g.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid transfer" }, { status: 400 });
  const d = parsed.data;
  /* sending requires access to the source shop; any shop can receive */
  if (!canAccessLocation(g.staff, d.fromId)) {
    return NextResponse.json({ error: "You can only send stock from your own location" }, { status: 403 });
  }
  try {
    await ensureLocations();
    const to = await db.location.findUnique({ where: { id: d.toId } });
    if (!to?.active) return NextResponse.json({ error: "Destination location is inactive" }, { status: 409 });
    const r = await db.$transaction((tx) =>
      transferStock(tx, { productId: d.productId, fromId: d.fromId, toId: d.toId, quantity: d.quantity, actorId: g.staff.id, note: d.note })
    );
    await audit(g.staff, "stock.transfer", {
      entity: "Product", entityId: d.productId,
      summary: `Transferred ${d.quantity} × "${r.out.name}" from ${r.out.locationName} to ${r.inn.locationName}${d.note ? ` (${d.note})` : ""}`,
      details: { ...d, note: d.note ?? null }, ip: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StockError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    console.error("stock transfer", e);
    return NextResponse.json({ error: "Failed to transfer stock" }, { status: 500 });
  }
}
