/* Points of sale: default shops, bootstrap of per-location stock, staff
   location scope and order routing by region. Server-side only. */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { StaffSession } from "@/lib/admin-auth";

export const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Western North", "Central", "Eastern", "Volta", "Oti",
  "Northern", "Savannah", "North East", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
] as const;

/* Created the first time the dashboard or checkout needs locations.
   Names/regions are editable in Admin → Locations. */
const DEFAULTS = [
  { code: "ACC", name: "Accra", city: "Accra", isMain: true, sortOrder: 1,
    regions: ["Greater Accra", "Central", "Eastern", "Volta", "Oti", "Western"] },
  { code: "KSI", name: "Kumasi", city: "Kumasi", isMain: false, sortOrder: 2,
    regions: ["Ashanti", "Bono", "Bono East", "Ahafo", "Western North"] },
  { code: "TML", name: "Tamale", city: "Tamale", isMain: false, sortOrder: 3,
    regions: ["Northern", "Savannah", "North East", "Upper East", "Upper West"] },
];

let ready = false;

/** Ensures at least one location exists. On first run, all existing product
    stock is assigned to the main shop so totals stay identical. Idempotent. */
export async function ensureLocations(): Promise<void> {
  if (ready) return;
  const count = await db.location.count();
  if (count === 0) {
    try {
      await db.$transaction(async (tx) => {
        for (const d of DEFAULTS) {
          await tx.location.create({ data: { ...d, regions: d.regions.join(",") } });
        }
        const main = await tx.location.findFirstOrThrow({ where: { isMain: true } });
        const products = await tx.product.findMany({ select: { id: true, stock: true } });
        if (products.length) {
          await tx.productStock.createMany({
            data: products.map((p) => ({ productId: p.id, locationId: main.id, quantity: Math.max(0, p.stock) })),
            skipDuplicates: true,
          });
        }
      });
    } catch (e) {
      /* another request bootstrapped concurrently — fine */
      if ((await db.location.count()) === 0) throw e;
    }
  }
  await backfillProductStock();
  ready = true;
}

/** Products that have no per-location rows yet (e.g. imported after the shops
    were created) get their whole stock assigned to the main shop. */
export async function backfillProductStock(): Promise<void> {
  const main = await db.location.findFirst({ where: { isMain: true } });
  if (!main) return;
  await db.$executeRaw`INSERT INTO "ProductStock" ("productId", "locationId", "quantity", "updatedAt")
    SELECT p."id", ${main.id}, GREATEST(p."stock", 0), now() FROM "Product" p
    WHERE NOT EXISTS (SELECT 1 FROM "ProductStock" ps WHERE ps."productId" = p."id")
    ON CONFLICT DO NOTHING`;
}

export async function mainLocationId(tx: Prisma.TransactionClient | typeof db = db): Promise<number> {
  const main = (await tx.location.findFirst({ where: { isMain: true, active: true } }))
    ?? (await tx.location.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } }));
  if (!main) throw new Error("No active location");
  return main.id;
}

/** Location that fulfils online orders for a region (falls back to the main shop). */
export async function locationForRegion(tx: Prisma.TransactionClient, region: string): Promise<number> {
  const all = await tx.location.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const match = all.find((l) => l.regions.split(",").map((r) => r.trim()).includes(region));
  return match?.id ?? (await mainLocationId(tx));
}

/* ---------------- staff scope ---------------- */

/** null = all locations; otherwise the ids this staff member may act on. */
export function scopeOf(staff: Pick<StaffSession, "role" | "locationIds">): number[] | null {
  if (staff.role === "OWNER" || staff.role === "ADMIN") return null;
  return staff.locationIds;
}

export function canAccessLocation(staff: Pick<StaffSession, "role" | "locationIds">, locationId: number | null | undefined): boolean {
  const scope = scopeOf(staff);
  if (scope === null) return true;
  return locationId != null && scope.includes(locationId);
}

/** Prisma filter for rows with a locationId column, limited to the staff scope. */
export function locationWhere(staff: Pick<StaffSession, "role" | "locationIds">, requested?: number | null): { locationId?: number | { in: number[] } } {
  const scope = scopeOf(staff);
  if (requested) {
    if (scope !== null && !scope.includes(requested)) return { locationId: { in: [] } };
    return { locationId: requested };
  }
  return scope === null ? {} : { locationId: { in: scope } };
}
