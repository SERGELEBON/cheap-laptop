/* Admin product — read, update, delete */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { can } from "@/lib/rbac";
import { discountOf, productUpdateSchema, publicProductRow } from "@/lib/admin-products";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<number | null> {
  const n = Number((await ctx.params).id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("products:read", req);
  if (!g.ok) return g.res;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const p = await db.product.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const [movements, sold] = await Promise.all([
    can(g.staff.role, "stock:read")
      ? db.stockMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { email: true, name: true } }, location: { select: { name: true, code: true } } } })
      : [],
    db.orderItem.aggregate({ where: { productId: id, order: { status: { not: "cancelled" } } }, _sum: { qty: true } }),
  ]);
  return NextResponse.json({
    product: publicProductRow(p, can(g.staff.role, "finance:view")),
    movements,
    unitsSold: sold._sum.qty ?? 0,
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("products:update", req);
  if (!g.ok) return g.res;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = productUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data" }, { status: 400 });
  }
  const d = parsed.data;
  const current = await db.product.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const data: Prisma.ProductUpdateInput = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.sku !== undefined) data.sku = d.sku.toUpperCase();
  if (d.slug !== undefined) data.slug = d.slug;
  if (d.status !== undefined) data.status = d.status;
  if (d.image !== undefined) data.image = d.image || null;
  if (d.gallery !== undefined) data.gallery = d.gallery.join("\n");
  if (d.categorySlugs !== undefined) data.categorySlugs = d.categorySlugs.join(",");
  if (d.brandSlug !== undefined) data.brandSlug = d.brandSlug || null;
  if (d.shortDescription !== undefined) data.shortDescription = d.shortDescription;
  if (d.description !== undefined) data.description = d.description;
  if (d.lowStockThreshold !== undefined) data.lowStockThreshold = d.lowStockThreshold;
  if (d.featured !== undefined) data.featured = d.featured;
  if (d.costPrice !== undefined && can(g.staff.role, "finance:view")) data.costPrice = d.costPrice;
  if (d.price !== undefined || d.regularPrice !== undefined) {
    const price = d.price ?? current.price;
    const regular = d.regularPrice !== undefined ? d.regularPrice : current.regularPrice;
    if (regular != null && regular < price) return NextResponse.json({ error: "Regular price must be ≥ sale price" }, { status: 400 });
    const discount = discountOf(price, regular ?? null);
    Object.assign(data, { price, regularPrice: regular ?? null, discount, onSale: discount > 0 });
  }

  /* record which fields changed, for the audit trail */
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(data)) {
    const before = (current as Record<string, unknown>)[k];
    if (before !== v) changes[k] = { from: before ?? null, to: v ?? null };
  }

  try {
    const product = await db.product.update({ where: { id }, data });
    if (Object.keys(changes).length) {
      await audit(g.staff, "product.update", {
        entity: "Product", entityId: id,
        summary: `Updated "${product.name}": ${Object.keys(changes).join(", ")}`,
        details: JSON.parse(JSON.stringify(changes)), ip: clientIp(req),
      });
    }
    return NextResponse.json({ ok: true, product: publicProductRow(product, can(g.staff.role, "finance:view")) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Another product already uses this SKU or slug" }, { status: 409 });
    }
    console.error("product update", e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/* Hard delete is only allowed for products never sold; otherwise archive. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("products:delete", req);
  if (!g.ok) return g.res;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const p = await db.product.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const sold = await db.orderItem.count({ where: { productId: id } });
  if (sold > 0) {
    return NextResponse.json(
      { error: "This product appears in orders and can't be deleted. Archive it instead to hide it from the store.", code: "HAS_ORDERS" },
      { status: 409 }
    );
  }
  await db.product.delete({ where: { id } });
  await audit(g.staff, "product.delete", { entity: "Product", entityId: id, summary: `Deleted "${p.name}" (${p.sku})`, details: { sku: p.sku, name: p.name }, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
