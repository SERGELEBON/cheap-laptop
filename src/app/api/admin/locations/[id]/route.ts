/* Update or remove a point of sale. A location that holds stock or has
   orders can't be deleted — deactivate it instead (history stays intact). */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { locationUpdateSchema } from "@/lib/location-schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const idOf = async (ctx: Ctx) => {
  const n = Number((await ctx.params).id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function PUT(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("locations:manage", req);
  if (!g.ok) return g.res;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const parsed = locationUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid location" }, { status: 400 });
  const d = parsed.data;

  const current = await db.location.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  if (current.isMain && (d.isMain === false || d.active === false)) {
    return NextResponse.json({ error: "Make another location the main shop first" }, { status: 409 });
  }
  try {
    const loc = await db.$transaction(async (tx) => {
      if (d.isMain) await tx.location.updateMany({ where: { id: { not: id } }, data: { isMain: false } });
      return tx.location.update({
        where: { id },
        data: { ...d, regions: d.regions ? d.regions.join(",") : undefined },
      });
    });
    await audit(g.staff, "location.update", {
      entity: "Location", entityId: id, summary: `Updated location "${loc.name}": ${Object.keys(d).join(", ")}`, ip: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Another location already uses this code" }, { status: 409 });
    }
    console.error("location update", e);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("locations:manage", req);
  if (!g.ok) return g.res;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const loc = await db.location.findUnique({ where: { id } });
  if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  if (loc.isMain) return NextResponse.json({ error: "The main shop can't be deleted" }, { status: 409 });
  const [stock, orders] = await Promise.all([
    db.productStock.aggregate({ where: { locationId: id }, _sum: { quantity: true } }),
    db.order.count({ where: { locationId: id } }),
  ]);
  if ((stock._sum.quantity ?? 0) > 0 || orders > 0) {
    return NextResponse.json(
      { error: "This location has stock or orders. Transfer its stock and deactivate it instead.", code: "IN_USE" },
      { status: 409 }
    );
  }
  await db.location.delete({ where: { id } });
  await audit(g.staff, "location.delete", { entity: "Location", entityId: id, summary: `Deleted location "${loc.name}" (${loc.code})`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
