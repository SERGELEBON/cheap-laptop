/* Google OAuth callback: verifies state, exchanges the code (PKCE), reads the
   verified Google profile, and signs the staff member in — invite-only. */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  appOrigin, clientIp, googleRedirectUri, oauthCookie, ownerEmails, readOAuthState,
  SESSION_COOKIE, sessionCookieOptions, sessionCookieValue,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  const base = appOrigin(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${base}/?auth_error=${code}#/admin`);
    res.cookies.set(oauthCookie.name, "", { ...oauthCookie.options, maxAge: 0 });
    return res;
  };

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return fail("cancelled");

  const saved = readOAuthState(req.cookies.get(oauthCookie.name)?.value);
  if (!code || !state || !saved || saved.state !== state) return fail("invalid_state");

  try {
    /* 1. exchange the authorization code — directly with Google over TLS */
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(req),
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }),
    });
    if (!tokenRes.ok) {
      console.error("google token exchange failed", tokenRes.status, await tokenRes.text());
      return fail("google_failed");
    }
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return fail("google_failed");

    /* 2. read the verified profile */
    const profRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profRes.ok) return fail("google_failed");
    const p = (await profRes.json()) as GoogleProfile;
    const email = p.email?.toLowerCase();
    if (!email || p.email_verified !== true) return fail("email_unverified");

    /* 3. invite-only: the email must belong to an active staff member
          (or be listed in OWNER_EMAILS to bootstrap the first owner) */
    let user = await db.staffUser.findUnique({ where: { email } });
    if (!user && ownerEmails().includes(email)) {
      user = await db.staffUser.create({ data: { email, role: "OWNER", name: p.name ?? null, image: p.picture ?? null } });
      await audit({ id: user.id, email }, "staff.bootstrap_owner", { entity: "StaffUser", entityId: user.id, summary: `${email} bootstrapped as owner`, ip: clientIp(req) });
    }
    if (!user) {
      await audit(null, "auth.denied", { summary: `Sign-in refused for ${email} (not invited)`, ip: clientIp(req) });
      return fail("not_invited");
    }
    if (!user.active) return fail("disabled");
    if (user.googleSub && user.googleSub !== p.sub) return fail("account_mismatch");

    user = await db.staffUser.update({
      where: { id: user.id },
      data: { googleSub: p.sub, name: p.name ?? user.name, image: p.picture ?? user.image, lastLoginAt: new Date() },
    });
    await audit({ id: user.id, email }, "auth.login", { summary: `${email} signed in`, ip: clientIp(req) });

    const res = NextResponse.redirect(`${base}/#/admin`);
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(user.id, user.sessionVersion), sessionCookieOptions);
    res.cookies.set(oauthCookie.name, "", { ...oauthCookie.options, maxAge: 0 });
    return res;
  } catch (e) {
    console.error("google callback error", e);
    return fail("server_error");
  }
}
