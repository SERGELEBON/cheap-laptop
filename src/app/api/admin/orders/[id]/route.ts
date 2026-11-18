/* Admin order status update */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin not allowed" }, { status: 403 });

  const { id } = await ctx.params;
  const oid = Number(id);
  if (!Number.isInteger(oid) || oid <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const order = await db.order.update({ where: { id: oid }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true, order });
}
