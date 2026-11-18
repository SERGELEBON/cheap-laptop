/* Generate a new one-time access link for a staff member (invitation or
   password reset). Any previous link stops working. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { appOrigin, clientIp, requireStaff } from "@/lib/admin-auth";
import { canManageStaff, type Role } from "@/lib/rbac";
import { INVITE_TTL_MS, inviteUrl, newInviteToken } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireStaff("staff:manage", req);
  if (!g.ok) return g.res;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const target = await db.staffUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  if (target.id !== g.staff.id && !canManageStaff(g.staff.role, target.role as Role)) {
    return NextResponse.json({ error: "You can't manage a staff member with this role" }, { status: 403 });
  }
  if (!target.active) return NextResponse.json({ error: "Enable this staff member first" }, { status: 409 });

  const { token, hash, expiresAt } = newInviteToken();
  await db.staffUser.update({ where: { id }, data: { inviteTokenHash: hash, inviteExpiresAt: expiresAt } });
  await audit(g.staff, "staff.access_link", {
    entity: "StaffUser", entityId: id,
    summary: `New ${target.passwordHash ? "password reset" : "invitation"} link for ${target.email}`, ip: clientIp(req),
  });
  return NextResponse.json({ url: inviteUrl(appOrigin(req), token), expiresAt, hours: INVITE_TTL_MS / 3600000, email: target.email });
}
