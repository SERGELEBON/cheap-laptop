/* Admin authentication — scrypt password hashing, HMAC-signed session cookie,
   in-memory login rate limiting and same-origin enforcement. Server-side only. */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "cl_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function sessionSecret(): string {
  // In production set ADMIN_SECRET in .env; fallback derives a stable dev secret.
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "cheap-laptops-dev-secret-2025";
}

/* ---------- password hashing (scrypt, per-user random salt) ---------- */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/* ---------- signed session token ---------- */
function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username, e: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): { username: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.u !== "string" || typeof data.e !== "number" || data.e < Date.now()) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

/* ---------- cookie helpers ---------- */
export async function setSessionCookie(username: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createToken(username), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}

/* ---------- session check for API routes ---------- */
export async function requireAdmin(): Promise<{ ok: true; username: string } | { ok: false }> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const session = readToken(token);
  return session ? { ok: true, username: session.username } : { ok: false };
}

/* ---------- login rate limiting (5 attempts / 15 min / IP) ---------- */
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 15 * 60 * 1000;
const MAX = 5;

export function rateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(key, { n: 1, first: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  rec.n += 1;
  if (rec.n > MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.first + WINDOW - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}

/* ---------- same-origin check (CSRF layer on mutations) ---------- */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, same-site server calls)
  try {
    const host = req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* ---------- ensure an admin user exists (seed from env) ---------- */
export async function ensureAdminUser() {
  const count = await db.adminUser.count();
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "CheapAdmin2025!";
    await db.adminUser.create({ data: { username, passwordHash: hashPassword(password) } });
  }
}
