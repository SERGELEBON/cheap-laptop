/* Admin login — rate limited, scrypt-verified, sets an httpOnly signed cookie */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureAdminUser, verifyPassword, setSessionCookie, rateLimit, resetRateLimit, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin login is not allowed" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    await ensureAdminUser();
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });
    }
    const { username, password } = parsed.data;

    const user = await db.adminUser.findUnique({ where: { username } });
    /* Generic error to avoid revealing whether the username exists */
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    resetRateLimit(`login:${ip}`);
    await setSessionCookie(user.username);
    return NextResponse.json({ ok: true, username: user.username });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
