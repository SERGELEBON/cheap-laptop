/* Admin order list */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Math.min(500, Number(searchParams.get("page") || 1) || 1));
  const per = Math.max(1, Math.min(50, Number(searchParams.get("per") || 10) || 10));

  const where = STATUSES.includes(status) ? { status } : {};

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
      include: { items: true },
    }),
  ]);

  return NextResponse.json({ total, page, per, rows });
}
