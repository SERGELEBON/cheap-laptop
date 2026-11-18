/* Sign out. ?all=1 revokes every session of this staff member (all devices). */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clearSessionCookie, clientIp, getStaff, sameOrigin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  try {
    const staff = await getStaff();
    if (staff) {
      if (new URL(req.url).searchParams.get("all") === "1") {
        await db.staffUser.update({ where: { id: staff.id }, data: { sessionVersion: { increment: 1 } } });
      }
      await audit(staff, "auth.logout", { summary: `${staff.email} signed out`, ip: clientIp(req) });
    }
  } catch (e) {
    console.error("logout", e);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
