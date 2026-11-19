/* Email + password sign-in (staff without Google). Generic errors, account
   lockout after repeated failures, same-origin only. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, sameOrigin, SESSION_COOKIE, sessionCookieOptions, sessionCookieValue } from "@/lib/admin-auth";
import { LOCK_MS, MAX_FAILED_LOGINS, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(200),
});

const INVALID = "Incorrect email or password";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: INVALID }, { status: 400 });
  const { email, password } = parsed.data;

  try {
    const user = await db.staffUser.findUnique({ where: { email } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({ error: `Too many failed attempts. Try again in ${min} min.` }, { status: 429 });
    }
    const ok = verifyPassword(password, user?.passwordHash);
    if (!user || !ok || !user.active) {
      if (user && !ok) {
        const fails = user.failedLogins + 1;
        await db.staffUser.update({
          where: { id: user.id },
          data: fails >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails },
        });
        if (fails >= MAX_FAILED_LOGINS) {
          await audit({ id: user.id, email }, "auth.locked", { summary: `${email} locked for 15 min after ${MAX_FAILED_LOGINS} failed attempts`, ip: clientIp(req) });
        }
      }
      if (user && ok && !user.active) return NextResponse.json({ error: "Your access has been disabled. Contact an administrator." }, { status: 403 });
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    await db.staffUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await audit({ id: user.id, email }, "auth.login", { summary: `${email} signed in (password)`, ip: clientIp(req) });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(user.id, user.sessionVersion), sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("password login", e);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable" }, { status: 503 });
  }
}
