/* Stock movement ledger (most recent first), filterable by product and type. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const query = z.object({
  productId: z.coerce.number().int().positive().optional(),
  type: z.enum(["", "INITIAL", "RESTOCK", "RETURN", "SALE", "CANCEL", "DAMAGE", "LOSS", "COUNT"]).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: NextRequest) {
  const g = await requireStaff("stock:read", req);
  if (!g.ok) return g.res;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { productId, type, page, per } = parsed.data;
  const where = { ...(productId ? { productId } : {}), ...(type ? { type } : {}) };

  try {
    const [total, rows] = await Promise.all([
      db.stockMovement.count({ where }),
      db.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * per,
        take: per,
        include: {
          product: { select: { id: true, name: true, sku: true, image: true } },
          actor: { select: { email: true, name: true } },
        },
      }),
    ]);
    return NextResponse.json({ total, page, per, rows });
  } catch (e) {
    console.error("movements", e);
    return NextResponse.json({ error: "Failed to load stock movements" }, { status: 500 });
  }
}
