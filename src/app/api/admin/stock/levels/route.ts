/* Stock levels per product and per location (inventory matrix).
   Staff limited to some shops only see those shops' columns. */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";
import { ensureLocations, scopeOf } from "@/lib/locations";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().max(80).default(""),
  locationId: z.coerce.number().int().positive().optional(),
  state: z.enum(["", "low", "out"]).default(""),
  sort: z.enum(["stock_asc", "stock_desc", "name"]).default("stock_asc"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  const g = await requireStaff("stock:read", req);
  if (!g.ok) return g.res;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { q, state, sort, page, per } = parsed.data;

  try {
    await ensureLocations();
    const scope = scopeOf(g.staff);
    const locations = await db.location.findMany({
      where: { active: true, ...(scope === null ? {} : { id: { in: scope } }) },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, name: true, code: true },
    });
    const locIds = locations.map((l) => l.id);
    /* the quantity we filter/sort on: one shop, or the sum of the shops this person can see */
    const focus = parsed.data.locationId && locIds.includes(parsed.data.locationId) ? [parsed.data.locationId] : locIds;

    const where: Prisma.ProductWhereInput = {
      status: { not: "ARCHIVED" },
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    };
    const products = await db.product.findMany({
      where,
      select: { id: true, name: true, sku: true, image: true, status: true, lowStockThreshold: true, stocks: { where: { locationId: { in: locIds } }, select: { locationId: true, quantity: true } } },
    });

    let rows = products.map((p) => {
      const byLoc = Object.fromEntries(locIds.map((id) => [id, 0])) as Record<number, number>;
      for (const s of p.stocks) byLoc[s.locationId] = s.quantity;
      const qty = focus.reduce((a, id) => a + (byLoc[id] ?? 0), 0);
      /* status on the quantity in focus: one shop, or the total of the visible shops */
      const out = qty <= 0;
      const low = !out && qty <= p.lowStockThreshold;
      const { stocks, ...rest } = p;
      void stocks;
      return { ...rest, byLocation: byLoc, quantity: qty, state: out ? "out" : low ? "low" : "in" };
    });
    if (state) rows = rows.filter((r) => r.state === state);
    rows.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "stock_desc" ? b.quantity - a.quantity : a.quantity - b.quantity));
    const total = rows.length;
    return NextResponse.json({ locations, total, page, per, rows: rows.slice((page - 1) * per, page * per) });
  } catch (e) {
    console.error("stock levels", e);
    return NextResponse.json({ error: "Failed to load stock levels" }, { status: 500 });
  }
}
