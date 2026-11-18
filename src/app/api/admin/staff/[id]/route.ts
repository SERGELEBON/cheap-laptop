/* Change a staff member's role / access, sign them out everywhere, or remove them. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/admin-auth";
import { assignableRoles, canManageStaff, ROLES, ROLE_INFO, type Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  name: z.string().trim().max(80).optional(),
  revokeSessions: z.literal(true).optional(),
});

async function loadTarget(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return db.staffUser.findUnique({ where: { id } });
}

/** Refuse changes that would leave the store without an active owner. */
async function isLastOwner(id: number): Promise<boolean> {
  const owners = await db.staffUser.findMany({ where: { role: "OWNER", active: true }, select: { id: true } });
  return owners.length === 1 && owners[0].id === id;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("staff:manage", req);
  if (!g.ok) return g.res;
  const target = await loadTarget(ctx);
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  if (target.id === g.staff.id && (d.role !== undefined || d.active !== undefined)) {
    return NextResponse.json({ error: "You can't change your own role or access" }, { status: 403 });
  }
  if (!canManageStaff(g.staff.role, target.role as Role)) {
    return NextResponse.json({ error: "You can't manage a staff member with this role" }, { status: 403 });
  }
  if (d.role && !assignableRoles(g.staff.role).includes(d.role)) {
    return NextResponse.json({ error: `You can't grant the ${ROLE_INFO[d.role].label} role` }, { status: 403 });
  }
  if (target.role === "OWNER" && ((d.role && d.role !== "OWNER") || d.active === false) && (await isLastOwner(target.id))) {
    return NextResponse.json({ error: "The store must keep at least one active owner" }, { status: 409 });
  }

  const changes: string[] = [];
  const data: Record<string, unknown> = {};
  if (d.name !== undefined) { data.name = d.name || null; changes.push("name"); }
  if (d.role && d.role !== target.role) {
    data.role = d.role;
    changes.push(`role ${ROLE_INFO[target.role as Role].label} → ${ROLE_INFO[d.role].label}`);
  }
  if (d.active !== undefined && d.active !== target.active) {
    data.active = d.active;
    changes.push(d.active ? "access restored" : "access disabled");
  }
  /* role change, disabling or explicit request → sign out all their sessions */
  if (d.revokeSessions || data.role || d.active === false) {
    data.sessionVersion = { increment: 1 };
    if (d.revokeSessions) changes.push("signed out everywhere");
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  const user = await db.staffUser.update({ where: { id: target.id }, data });
  await audit(g.staff, "staff.update", { entity: "StaffUser", entityId: target.id, summary: `${target.email}: ${changes.join(", ")}`, ip: clientIp(req) });
  return NextResponse.json({ ok: true, user: { id: user.id, role: user.role, active: user.active } });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = await requireStaff("staff:manage", req);
  if (!g.ok) return g.res;
  const target = await loadTarget(ctx);
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.id === g.staff.id) return NextResponse.json({ error: "You can't remove yourself" }, { status: 403 });
  if (!canManageStaff(g.staff.role, target.role as Role)) {
    return NextResponse.json({ error: "You can't remove a staff member with this role" }, { status: 403 });
  }
  if (target.role === "OWNER" && (await isLastOwner(target.id))) {
    return NextResponse.json({ error: "The store must keep at least one active owner" }, { status: 409 });
  }
  await db.staffUser.delete({ where: { id: target.id } });
  await audit(g.staff, "staff.remove", { entity: "StaffUser", entityId: target.id, summary: `Removed ${target.email} (${ROLE_INFO[target.role as Role].label})`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
