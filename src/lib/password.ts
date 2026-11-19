/* Email + password sign-in for staff without a Google account:
   scrypt hashing, one-time invite/reset links, lockout after failed attempts.
   Server-side only. */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 h
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  /* always run scrypt so response time doesn't reveal whether an account has a password */
  const [salt, hash] = (stored || "0000:").split(":");
  const candidate = scryptSync(password, salt || "0000", 64);
  if (!stored || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers.";
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Don't include your email in the password.";
  return null;
}

/** One-time link token: the raw token goes in the link, only its hash is stored. */
export function newInviteToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token lives in the URL fragment so it is never sent to servers or in Referer headers. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin}/#/admin/invite/${token}`;
}
