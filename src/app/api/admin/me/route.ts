/* Current staff member + their effective permissions (drives the UI). */
import { NextResponse } from "next/server";
import { getStaff, googleConfigured } from "@/lib/admin-auth";
import { ROLE_PERMISSIONS } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ensureLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getStaff();
    if (!staff) return NextResponse.json({ error: "Unauthorized", googleConfigured: googleConfigured() }, { status: 401 });
    await ensureLocations();
    const locations = await db.location.findMany({
      where: { active: true, ...(staff.locationIds === null ? {} : { id: { in: staff.locationIds } }) },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, name: true, code: true, city: true, isMain: true },
    });
    /* every active shop (for transfers / reassignment targets) */
    const allLocations = await db.location.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, name: true, code: true } });
    return NextResponse.json({ ok: true, user: staff, permissions: ROLE_PERMISSIONS[staff.role], locations, allLocations });
  } catch (e) {
    console.error("me", e);
    return NextResponse.json({ error: "Database unavailable", googleConfigured: googleConfigured() }, { status: 503 });
  }
}
