/* Points of sale — list (with stock & staff counts) and create. */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { ensureLocations, GHANA_REGIONS, scopeOf } from "@/lib/locations";
import { locationCreateSchema } from "@/lib/location-schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await requireStaff("dashboard:view", req);
  if (!g.ok) return g.res;
  try {
    await ensureLocations();
    const scope = scopeOf(g.staff);
    const rows = await db.location.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      include: { _count: { select: { staff: true, orders: true } } },
    });
    const sums = await db.productStock.groupBy({ by: ["locationId"], _sum: { quantity: true } });
    const units = Object.fromEntries(sums.map((s) => [s.locationId, s._sum.quantity ?? 0]));
    const lowRows = await db.$queryRaw<{ locationId: number; low: bigint; out: bigint }[]>`
      SELECT ps."locationId",
             COUNT(*) FILTER (WHERE ps."quantity" > 0 AND ps."quantity" <= p."lowStockThreshold") AS low,
             COUNT(*) FILTER (WHERE ps."quantity" <= 0) AS out
      FROM "ProductStock" ps JOIN "Product" p ON p."id" = ps."productId"
      WHERE p."status" = 'ACTIVE'
      GROUP BY ps."locationId"`;
    const alerts = Object.fromEntries(lowRows.map((r) => [r.locationId, { low: Number(r.low), out: Number(r.out) }]));
    return NextResponse.json({
      regions: GHANA_REGIONS,
      rows: rows.map(({ _count, regions, ...l }) => ({
        ...l,
        regions: regions.split(",").map((r) => r.trim()).filter(Boolean),
        staffCount: _count.staff,
        orderCount: _count.orders,
        units: units[l.id] ?? 0,
        low: alerts[l.id]?.low ?? 0,
        out: alerts[l.id]?.out ?? 0,
      })),
    });
  } catch (e) {
    console.error("locations list", e);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 500 });
  }
}



export async function POST(req: NextRequest) {
  const g = await requireStaff("locations:manage", req);
  if (!g.ok) return g.res;
  const parsed = locationCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid location" }, { status: 400 });
  const d = parsed.data;
  try {
    await ensureLocations();
    const loc = await db.$transaction(async (tx) => {
      if (d.isMain) await tx.location.updateMany({ data: { isMain: false } });
      return tx.location.create({ data: { ...d, regions: d.regions.join(",") } });
    });
    await audit(g.staff, "location.create", { entity: "Location", entityId: loc.id, summary: `Created location "${loc.name}" (${loc.code})`, ip: clientIp(req) });
    return NextResponse.json({ ok: true, id: loc.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Another location already uses this code" }, { status: 409 });
    }
    console.error("location create", e);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
