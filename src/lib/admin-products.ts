/* Shared product validation & serialization for admin routes. Server-side only. */
import { z } from "zod";
import type { Product } from "@prisma/client";

const money = z.number().int().min(0).max(1_000_000_000); // pesewas

const base = {
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(160),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  price: money.refine((v) => v > 0, "Price must be greater than 0"),
  regularPrice: money.nullable().optional(),
  costPrice: money.nullable().optional(),
  image: z.string().trim().max(500).refine((v) => !v || v.startsWith("/") || /^https:\/\//.test(v), "Image must be a /path or an https:// URL").nullable().optional(),
  categorySlugs: z.array(z.string().trim().regex(/^[a-z0-9-]+$/)).max(10),
  brandSlug: z.string().trim().max(60).nullable().optional(),
  shortDescription: z.string().trim().max(400),
  description: z.string().trim().max(8000),
  lowStockThreshold: z.number().int().min(0).max(10000),
  featured: z.boolean(),
};

export const productCreateSchema = z
  .object({
    ...base,
    status: base.status.default("ACTIVE"),
    sku: z.string().trim().max(40).regex(/^[A-Za-z0-9-]*$/, "SKU: letters, digits and dashes only").optional(),
    slug: z.string().trim().max(80).regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Slug: lowercase words separated by dashes").optional(),
    stock: z.number().int().min(0).max(100000),
    categorySlugs: base.categorySlugs.default([]),
    shortDescription: base.shortDescription.default(""),
    description: base.description.default(""),
    lowStockThreshold: base.lowStockThreshold.default(3),
    featured: base.featured.default(false),
  })
  .refine((d) => d.regularPrice == null || d.regularPrice >= d.price, { message: "Regular price must be ≥ sale price" });

/* Stock is NOT updatable here — it only changes through stock movements. */
export const productUpdateSchema = z
  .object({
    ...base,
    sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, "SKU: letters, digits and dashes only"),
    slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase words separated by dashes"),
  })
  .partial()
  .refine((d) => d.regularPrice == null || d.price == null || d.regularPrice >= d.price, { message: "Regular price must be ≥ sale price" });

export function discountOf(price: number, regular: number | null): number {
  return regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "product"
  ) + "-" + Math.random().toString(36).slice(2, 6);
}

/** Strips finance-only fields for roles without finance:view. */
export function publicProductRow(p: Product, finance: boolean) {
  const { costPrice, ...rest } = p;
  return {
    ...rest,
    categorySlugs: p.categorySlugs.split(",").filter(Boolean),
    costPrice: finance ? costPrice : undefined,
    stockState: p.stock <= 0 ? "out" : p.stock <= p.lowStockThreshold ? "low" : "in",
  };
}
