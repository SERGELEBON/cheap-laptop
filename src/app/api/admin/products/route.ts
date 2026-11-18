/* Admin product management — list & create */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  name: z.string().trim().min(3).max(160),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, "SKU: letters, digits, dashes only"),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase words separated by dashes"),
  price: z.number().int().min(0).max(100000000),
  regularPrice: z.number().int().min(0).max(100000000).nullable().optional(),
  image: z.string().trim().max(300).optional().nullable(),
  categorySlugs: z.string().trim().max(300).optional(),
  brandSlug: z.string().trim().max(60).optional().nullable(),
  shortDescription: z.string().trim().max(400).optional(),
  description: z.string().trim().max(4000).optional(),
  stock: z.number().int().min(0).max(100000),
  featured: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(searchParams.get("page") || 1) || 1));
  const per = Math.max(1, Math.min(50, Number(searchParams.get("per") || 10) || 10));

  const where = q
    ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brandSlug: { contains: q } }] }
    : {};

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  return NextResponse.json({ total, page, per, rows });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin not allowed" }, { status: 403 });

  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product data", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }
  const d = parsed.data;
  const regularPrice = d.regularPrice ?? null;
  const discount = regularPrice && regularPrice > d.price ? Math.round(((regularPrice - d.price) / regularPrice) * 100) : 0;

  try {
    const product = await db.product.create({
      data: {
        name: d.name,
        sku: d.sku.toUpperCase(),
        slug: d.slug,
        price: d.price,
        regularPrice,
        onSale: discount > 0,
        discount,
        image: d.image || null,
        categorySlugs: d.categorySlugs || "",
        brandSlug: d.brandSlug || null,
        shortDescription: d.shortDescription || "",
        description: d.description || "",
        stock: d.stock,
        featured: d.featured || false,
      },
    });
    return NextResponse.json({ ok: true, id: product.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique")) return NextResponse.json({ error: "SKU or slug already exists" }, { status: 409 });
    throw e;
  }
}
