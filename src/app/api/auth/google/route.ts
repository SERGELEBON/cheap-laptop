/* Starts "Sign in with Google": redirects to Google with state + PKCE. */
import { NextRequest, NextResponse } from "next/server";
import { googleConfigured, googleRedirectUri, newOAuthState, oauthCookie, appOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${appOrigin(req)}/?auth_error=not_configured#/admin`);
  }
  const { state, challenge, cookie } = newOAuthState();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set(oauthCookie.name, cookie, oauthCookie.options);
  return res;
}
