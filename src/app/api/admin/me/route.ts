/* Current staff member + their effective permissions (drives the UI). */
import { NextResponse } from "next/server";
import { getStaff, googleConfigured } from "@/lib/admin-auth";
import { ROLE_PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getStaff();
    if (!staff) return NextResponse.json({ error: "Unauthorized", googleConfigured: googleConfigured() }, { status: 401 });
    return NextResponse.json({ ok: true, user: staff, permissions: ROLE_PERMISSIONS[staff.role] });
  } catch (e) {
    console.error("me", e);
    return NextResponse.json({ error: "Database unavailable", googleConfigured: googleConfigured() }, { status: 503 });
  }
}
