/* Staff list & invitations. Access is invite-only: an invited email can then
   sign in with the matching Google account. */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { appOrigin, clientIp, requireStaff } from "@/lib/admin-auth";
import { inviteUrl, newInviteToken } from "@/lib/password";
import { assignableRoles, ROLES, ROLE_INFO } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await requireStaff("staff:read", req);
  if (!g.ok) return g.res;
  const rows = await db.staffUser.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true, email: true, name: true, image: true, role: true, active: true, lastLoginAt: true, createdAt: true, googleSub: true,
      passwordHash: true, inviteExpiresAt: true,
      invitedBy: { select: { email: true } },
    },
  });
  return NextResponse.json({
    rows: rows.map(({ googleSub, passwordHash, inviteExpiresAt, ...r }) => ({
      ...r,
      hasGoogle: !!googleSub,
      hasPassword: !!passwordHash,
      hasSignedIn: !!r.lastLoginAt,
      linkPending: !!inviteExpiresAt && inviteExpiresAt > new Date(),
    })),
    assignableRoles: assignableRoles(g.staff.role),
    me: g.staff.id,
  });
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  role: z.enum(ROLES),
  name: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const g = await requireStaff("staff:manage", req);
  if (!g.ok) return g.res;
  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid invitation" }, { status: 400 });
  const { email, role, name } = parsed.data;

  if (!assignableRoles(g.staff.role).includes(role)) {
    return NextResponse.json({ error: `You can't grant the ${ROLE_INFO[role].label} role` }, { status: 403 });
  }
  try {
    /* the invitee can sign in with Google (same email) or set a password via the one-time link */
    const link = newInviteToken();
    const user = await db.staffUser.create({
      data: { email, role, name: name || null, invitedById: g.staff.id, inviteTokenHash: link.hash, inviteExpiresAt: link.expiresAt },
    });
    await audit(g.staff, "staff.invite", { entity: "StaffUser", entityId: user.id, summary: `Invited ${email} as ${ROLE_INFO[role].label}`, ip: clientIp(req) });
    return NextResponse.json({ ok: true, id: user.id, url: inviteUrl(appOrigin(req), link.token), expiresAt: link.expiresAt }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "This email is already a staff member" }, { status: 409 });
    }
    console.error("staff invite", e);
    return NextResponse.json({ error: "Failed to invite" }, { status: 500 });
  }
}
