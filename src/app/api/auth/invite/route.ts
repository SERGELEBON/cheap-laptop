/* One-time invite / password-reset links. The token is only ever sent in a
   POST body (never in a URL), so it doesn't end up in access logs.
   POST {token}           → who the link is for (to show on the page)
   POST {token, password} → sets the password, consumes the link, signs in. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, sameOrigin, SESSION_COOKIE, sessionCookieOptions, sessionCookieValue } from "@/lib/admin-auth";
import { hashPassword, hashToken, passwordProblem } from "@/lib/password";
import { ROLE_INFO, type Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

async function findByToken(token: string | null | undefined) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const user = await db.staffUser.findUnique({ where: { inviteTokenHash: hashToken(token) } });
  if (!user || !user.active || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) return null;
  return user;
}

const EXPIRED = "This link is invalid or has expired. Ask an administrator for a new one.";

const schema = z.object({ token: z.string().min(20).max(100), password: z.string().max(200).optional(), name: z.string().trim().max(80).optional() });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const user = await findByToken(parsed.data.token);
    if (!user) return NextResponse.json({ error: EXPIRED }, { status: 404 });
    if (parsed.data.password === undefined) {
      return NextResponse.json({ email: user.email, name: user.name, role: ROLE_INFO[user.role as Role].label, mode: user.passwordHash ? "reset" : "invite" });
    }
    const problem = passwordProblem(parsed.data.password, user.email);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const reset = !!user.passwordHash;
    const updated = await db.staffUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(parsed.data.password),
        passwordSetAt: new Date(),
        inviteTokenHash: null, // one-time use
        inviteExpiresAt: null,
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        ...(parsed.data.name && !user.name ? { name: parsed.data.name } : {}),
        sessionVersion: { increment: 1 }, // a reset signs out every other session
      },
    });
    await audit({ id: user.id, email: user.email }, reset ? "auth.password_reset" : "auth.invite_accepted", {
      entity: "StaffUser", entityId: user.id,
      summary: reset ? `${user.email} reset their password` : `${user.email} accepted the invitation`, ip: clientIp(req),
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(updated.id, updated.sessionVersion), sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("invite accept", e);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
