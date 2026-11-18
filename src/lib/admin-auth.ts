/* Staff authentication — Google sign-in (OAuth 2.0 + PKCE), HMAC-signed
   httpOnly session cookie, per-request revocation check against the DB, and
   permission enforcement for API routes. Server-side only. */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { can, type Permission, type Role } from "@/lib/rbac";

export const SESSION_COOKIE = "cl_staff";
const OAUTH_COOKIE = "cl_oauth";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface StaffSession {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set (32+ random characters) in production");
  }
  return "dev-only-secret-change-me-dev-only-secret";
}

/* ---------------- signed tokens ---------------- */
function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/* ---------------- session cookie ---------------- */
export function sessionCookieValue(userId: number, version: number): string {
  return encode({ uid: userId, v: version, e: Date.now() + SESSION_TTL_MS });
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

/** Reads the cookie AND re-checks the user in the DB, so disabling a staff
    member or changing their role takes effect immediately. */
export async function getStaff(): Promise<StaffSession | null> {
  const jar = await cookies();
  const data = decode<{ uid: number; v: number; e: number }>(jar.get(SESSION_COOKIE)?.value);
  if (!data || typeof data.uid !== "number" || data.e < Date.now()) return null;
  const user = await db.staffUser.findUnique({ where: { id: data.uid } });
  if (!user || !user.active || user.sessionVersion !== data.v) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role as Role };
}

type Guard = { ok: true; staff: StaffSession } | { ok: false; res: NextResponse };

/** Use at the top of every admin route:
    const g = await requireStaff("products:update", req); if (!g.ok) return g.res; */
export async function requireStaff(permission: Permission, req?: Request): Promise<Guard> {
  if (req && req.method !== "GET" && !sameOrigin(req)) {
    return { ok: false, res: NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 }) };
  }
  let staff: StaffSession | null = null;
  try {
    staff = await getStaff();
  } catch (e) {
    console.error("auth: session check failed", e);
    return { ok: false, res: NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 }) };
  }
  if (!staff) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!can(staff.role, permission)) {
    return { ok: false, res: NextResponse.json({ error: "You don't have permission to do this" }, { status: 403 }) };
  }
  return { ok: true, staff };
}

/* ---------------- CSRF: same-origin check on mutations ---------------- */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/* ---------------- Google OAuth helpers ---------------- */
export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(req: Request): string {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export function googleRedirectUri(req: Request): string {
  return `${appOrigin(req)}/api/auth/google/callback`;
}

export function newOAuthState(): { state: string; verifier: string; challenge: string; cookie: string } {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const cookie = encode({ s: state, v: verifier, e: Date.now() + 10 * 60 * 1000 });
  return { state, verifier, challenge, cookie };
}

export function readOAuthState(value: string | undefined): { state: string; verifier: string } | null {
  const d = decode<{ s: string; v: string; e: number }>(value);
  if (!d || d.e < Date.now()) return null;
  return { state: d.s, verifier: d.v };
}

export const oauthCookie = { name: OAUTH_COOKIE, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth", maxAge: 600 } };

/** Comma-separated list of emails that become OWNER on first sign-in (bootstrap). */
export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
