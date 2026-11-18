/* Admin product update / delete */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  price: z.number().int().min(0).max(100000000).optional(),
  regularPrice: z.number().int().min(0).max(100000000).nullable().optional(),
  image: z.string().trim().max(300).nullable().optional(),
  categorySlugs: z.string().trim().max(300).optional(),
  shortDescription: z.string().trim().max(400).optional(),
  description: z.string().trim().max(4000).optional(),
  stock: z.number().int().min(0).max(100000).optional(),
  featured: z.boolean().optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin not allowed" }, { status: 403 });

  const { id } = await ctx.params;
  const pid = Number(id);
  if (!Number.isInteger(pid) || pid <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product data", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }
  const d = parsed.data;

  const data: Record<string, unknown> = { ...d };
  if (d.price !== undefined || d.regularPrice !== undefined) {
    const current = await db.product.findUnique({ where: { id: pid }, select: { price: true, regularPrice: true } });
    if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const price = d.price ?? current.price;
    const regularPrice = d.regularPrice !== undefined ? d.regularPrice : current.regularPrice;
    const discount = regularPrice && regularPrice > price ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;
    data.onSale = discount > 0;
    data.discount = discount;
  }

  const product = await db.product.update({ where: { id: pid }, data });
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin not allowed" }, { status: 403 });

  const { id } = await ctx.params;
  const pid = Number(id);
  if (!Number.isInteger(pid) || pid <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.product.delete({ where: { id: pid } });
  return NextResponse.json({ ok: true });
}
