/* Dashboard KPIs. Finance figures are only returned to roles with finance:view. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const g = await requireStaff("dashboard:view", req);
  if (!g.ok) return g.res;
  const finance = can(g.staff.role, "finance:view");
  const showOrders = can(g.staff.role, "orders:read");

  try {
    const since30 = new Date(Date.now() - 29 * DAY);
    since30.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [products, orders30, byStatusRaw, recent, topItems, revenueAll] = await Promise.all([
      db.product.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true, sku: true, image: true, stock: true, lowStockThreshold: true, price: true, costPrice: true, status: true } }),
      db.order.findMany({ where: { createdAt: { gte: since30 } }, select: { total: true, status: true, createdAt: true } }),
      db.order.groupBy({ by: ["status"], _count: { _all: true } }),
      showOrders
        ? db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, ref: true, customerName: true, total: true, status: true, createdAt: true } })
        : [],
      db.orderItem.groupBy({ by: ["name"], where: { order: { status: { not: "cancelled" } } }, _sum: { qty: true }, orderBy: { _sum: { qty: "desc" } }, take: 6 }),
      finance ? db.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }) : null,
    ]);

    /* revenue & orders per day, last 30 days */
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(since30.getTime() + i * DAY);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), revenue: 0, orders: 0 };
    });
    const map = new Map(days.map((d) => [d.key, d]));
    let revenue30 = 0;
    let ordersToday = 0;
    for (const o of orders30) {
      if (o.createdAt >= today) ordersToday++;
      if (o.status === "cancelled") continue;
      const b = map.get(o.createdAt.toISOString().slice(0, 10));
      if (b) { b.revenue += o.total / 100; b.orders++; }
      revenue30 += o.total;
    }
    const validOrders30 = orders30.filter((o) => o.status !== "cancelled").length;

    const active = products.filter((p) => p.status === "ACTIVE");
    const out = products.filter((p) => p.stock <= 0);
    const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const units = products.reduce((a, p) => a + Math.max(0, p.stock), 0);
    const byStatus = Object.fromEntries(byStatusRaw.map((s) => [s.status, s._count._all]));

    return NextResponse.json({
      finance,
      showOrders,
      kpis: {
        revenueTotal: finance ? revenueAll?._sum.total ?? 0 : null,
        revenue30: finance ? revenue30 : null,
        avgOrder30: finance && validOrders30 ? Math.round(revenue30 / validOrders30) : finance ? 0 : null,
        orders30: validOrders30,
        ordersToday,
        pendingOrders: (byStatus.pending ?? 0) + (byStatus.processing ?? 0),
        productsActive: active.length,
        productsTotal: products.length,
        unitsInStock: units,
        stockValueRetail: finance ? products.reduce((a, p) => a + Math.max(0, p.stock) * p.price, 0) : null,
        stockValueCost: finance ? products.reduce((a, p) => a + Math.max(0, p.stock) * (p.costPrice ?? 0), 0) : null,
        lowStock: low.length,
        outOfStock: out.length,
      },
      byStatus: showOrders ? byStatus : {},
      daily: days.map((d) => ({ date: d.label, revenue: finance ? Math.round(d.revenue * 100) / 100 : 0, orders: d.orders })),
      recentOrders: recent,
      topProducts: topItems.map((t) => ({ name: t.name, qty: t._sum.qty ?? 0 })),
      stockAlerts: [...out, ...low]
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8)
        .map((p) => ({ id: p.id, name: p.name, sku: p.sku, image: p.image, stock: p.stock, threshold: p.lowStockThreshold })),
    });
  } catch (e) {
    console.error("stats error", e);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
