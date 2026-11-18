/* Admin order list — search, status filter, pagination */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";
import { ORDER_STATUSES } from "@/lib/rbac";
import { locationWhere } from "@/lib/locations";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().max(80).default(""),
  status: z.enum(["", ...ORDER_STATUSES]).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per: z.coerce.number().int().min(1).max(100).default(15),
  locationId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const g = await requireStaff("orders:read", req);
  if (!g.ok) return g.res;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { q, status, page, per, locationId } = parsed.data;
  const scoped = locationWhere(g.staff, locationId);

  const where = {
    ...scoped,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { ref: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  try {
    const [total, rows, counts] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * per, take: per, include: { items: true, location: { select: { id: true, name: true, code: true } } } }),
      db.order.groupBy({ by: ["status"], where: scoped, _count: { _all: true } }),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return NextResponse.json({ total, page, per, rows, byStatus });
  } catch (e) {
    console.error("orders list", e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
