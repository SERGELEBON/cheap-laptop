/* Dashboard statistics — session-protected aggregation queries */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [orders, products, revenueAgg, recent, topItems] = await Promise.all([
      db.order.findMany({ select: { status: true, total: true, createdAt: true } }),
      db.product.findMany({ select: { id: true, stock: true, name: true } }),
      db.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { ref: true, customerName: true, total: true, status: true, createdAt: true, payment: true },
      }),
      db.orderItem.groupBy({
        by: ["name"],
        _sum: { qty: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 6,
      }),
    ]);

    /* revenue per day, last 14 days */
    const days: { date: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, revenue: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.createdAt.toISOString().slice(0, 10);
      const bucket = dayMap.get(key);
      if (bucket) bucket.revenue += o.total / 100;
    }

    const byStatus: Record<string, number> = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

    const lowStock = products.filter((p) => p.stock <= 2);

    return NextResponse.json({
      revenueTotal: revenueAgg._sum.total ?? 0,
      ordersCount: orders.length,
      productsCount: products.length,
      lowStockCount: lowStock.length,
      lowStock,
      byStatus,
      revenueByDay: days.map((d) => ({ date: d.date.slice(5), revenue: Math.round(d.revenue * 100) / 100 })),
      recentOrders: recent.map((o) => ({ ...o, totalFmt: (o.total / 100).toFixed(2) })),
      topProducts: topItems.map((t) => ({ name: t.name, qty: t._sum.qty ?? 0 })),
      since: since.toISOString(),
    });
  } catch (e) {
    console.error("stats error", e);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
