/* Validation for points of sale (shared by the location routes).
   Create and update are separate: Zod 4 applies .default() even inside
   .partial(), which would silently reset fields on a partial update. */
import { z } from "zod";
import { GHANA_REGIONS } from "@/lib/locations";

const fields = {
  name: z.string().trim().min(2, "Name is required").max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,6}$/, "Code: 2–6 letters or digits (e.g. ACC)"),
  city: z.string().trim().min(2, "City is required").max(60),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(40),
  regions: z.array(z.enum(GHANA_REGIONS)).max(GHANA_REGIONS.length),
  isMain: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
};

export const locationCreateSchema = z.object({
  ...fields,
  address: fields.address.default(""),
  phone: fields.phone.default(""),
  regions: fields.regions.default([]),
  isMain: fields.isMain.default(false),
  active: fields.active.default(true),
  sortOrder: fields.sortOrder.default(0),
});

export const locationUpdateSchema = z.object(fields).partial();
