/* Admin products — list (filters, sort, pagination) & create */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { can } from "@/lib/rbac";
import { productCreateSchema, discountOf, slugify, publicProductRow } from "@/lib/admin-products";

export const dynamic = "force-dynamic";

const listQuery = z.object({
  q: z.string().trim().max(80).default(""),
  status: z.enum(["", "ACTIVE", "DRAFT", "ARCHIVED"]).default(""),
  category: z.string().trim().max(60).default(""),
  stock: z.enum(["", "in", "low", "out"]).default(""),
  sort: z.enum(["newest", "name", "price_asc", "price_desc", "stock_asc", "stock_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  const g = await requireStaff("products:read", req);
  if (!g.ok) return g.res;

  const parsed = listQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { q, status, category, stock, sort, page, per } = parsed.data;

  const and: Prisma.ProductWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brandSlug: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (status) and.push({ status });
  if (category) and.push({ categorySlugs: { contains: category } });
  if (stock === "out") and.push({ stock: { lte: 0 } });
  if (stock === "in") and.push({ stock: { gt: 0 } });

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    newest: { id: "desc" as const },
    name: { name: "asc" as const },
    price_asc: { price: "asc" as const },
    price_desc: { price: "desc" as const },
    stock_asc: { stock: "asc" as const },
    stock_desc: { stock: "desc" as const },
  }[sort];

  try {
    let rows;
    let total: number;
    if (stock === "low") {
      /* low stock compares two columns (stock <= lowStockThreshold): filter in memory */
      const all = await db.product.findMany({ where: { AND: and }, orderBy });
      const low = all.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
      total = low.length;
      rows = low.slice((page - 1) * per, page * per);
    } else {
      [total, rows] = await Promise.all([
        db.product.count({ where: { AND: and } }),
        db.product.findMany({ where: { AND: and }, orderBy, skip: (page - 1) * per, take: per }),
      ]);
    }
    const finance = can(g.staff.role, "finance:view");
    return NextResponse.json({ total, page, per, rows: rows.map((r) => publicProductRow(r, finance)) });
  } catch (e) {
    console.error("products list", e);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireStaff("products:create", req);
  if (!g.ok) return g.res;

  const parsed = productCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data" }, { status: 400 });
  }
  const d = parsed.data;
  const slug = d.slug || slugify(d.name);
  const sku = (d.sku || `CL-${Date.now().toString(36).toUpperCase()}`).toUpperCase();
  const regularPrice = d.regularPrice ?? null;
  const discount = discountOf(d.price, regularPrice);

  try {
    const product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: d.name,
          slug,
          sku,
          status: d.status,
          price: d.price,
          regularPrice,
          costPrice: can(g.staff.role, "finance:view") ? d.costPrice ?? null : null,
          onSale: discount > 0,
          discount,
          image: d.image || null,
          categorySlugs: d.categorySlugs.join(","),
          brandSlug: d.brandSlug || null,
          shortDescription: d.shortDescription,
          description: d.description,
          stock: d.stock,
          lowStockThreshold: d.lowStockThreshold,
          featured: d.featured,
        },
      });
      await tx.stockMovement.create({
        data: { productId: p.id, type: "INITIAL", quantity: d.stock, stockBefore: 0, stockAfter: d.stock, actorId: g.staff.id, note: "Product created" },
      });
      return p;
    });
    await audit(g.staff, "product.create", { entity: "Product", entityId: product.id, summary: `Created "${product.name}" (${product.sku})`, ip: clientIp(req) });
    return NextResponse.json({ ok: true, id: product.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A product with this SKU or slug already exists" }, { status: 409 });
    }
    console.error("product create", e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
