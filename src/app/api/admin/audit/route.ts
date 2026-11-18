/* Activity log — who did what, when. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().max(80).default(""),
  area: z.enum(["", "auth", "product", "stock", "order", "staff", "location"]).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(req: NextRequest) {
  const g = await requireStaff("audit:read", req);
  if (!g.ok) return g.res;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { q, area, page, per } = parsed.data;

  const where = {
    ...(area ? { action: { startsWith: `${area}.` } } : {}),
    ...(q
      ? { OR: [{ summary: { contains: q, mode: "insensitive" as const } }, { actorEmail: { contains: q, mode: "insensitive" as const } }] }
      : {}),
  };
  try {
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * per, take: per, include: { actor: { select: { name: true, image: true } } } }),
    ]);
    return NextResponse.json({ total, page, per, rows });
  } catch (e) {
    console.error("audit", e);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
