/* Server-side catalog builder: seeds products from the static seed file on first
   run, then serves products from the DB (admin-editable) merged with the static
   category/brand/page data. Server-side only. */
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import type { Cat, Brand, Page, Product, Catalog } from "@/lib/types";

const PUB_DATA = path.join(process.cwd(), "public", "data");

interface SeedProduct {
  slug: string;
  name: string;
  sku: string;
  price: number;
  regularPrice: number | null;
  onSale: boolean;
  discount: number;
  image: string;
  categorySlugs: string[];
  brandSlug: string | null;
  shortDescription: string;
  description: string;
  averageRating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
}

let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const count = await db.product.count();
  if (count === 0) {
    const seed: SeedProduct[] = JSON.parse(fs.readFileSync(path.join(PUB_DATA, "products.json"), "utf8"));
    /* chunked insert to stay within SQLite parameter limits */
    for (let i = 0; i < seed.length; i += 10) {
      const chunk = seed.slice(i, i + 10);
      await db.product.createMany({
        data: chunk.map((p) => ({
          slug: p.slug,
          name: p.name,
          sku: p.sku,
          price: p.price,
          regularPrice: p.regularPrice,
          onSale: p.onSale,
          discount: p.discount,
          image: p.image,
          categorySlugs: p.categorySlugs.join(","),
          brandSlug: p.brandSlug,
          shortDescription: p.shortDescription,
          description: p.description,
          averageRating: p.averageRating,
          reviewCount: p.reviewCount,
          stock: p.stock,
          featured: p.featured,
        })),
      });
    }
  }
  seeded = true;
}

function ghs(pesewas: number): string {
  return "GH\u20B5 " + (pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function buildCatalog(): Promise<Catalog> {
  await ensureSeeded();

  const staticBase = JSON.parse(fs.readFileSync(path.join(PUB_DATA, "catalog.json"), "utf8")) as {
    categories: Omit<Cat, never>[];
    brands: Brand[];
    pages: Omit<Page, "id">[];
    homeSections: { title: string; slug: string; products: string[] }[];
  };

  const rows = await db.product.findMany({ orderBy: { id: "asc" } });
  const catList: Cat[] = staticBase.categories;
  const brandList: Brand[] = staticBase.brands;
  const catBySlug = new Map(catList.map((c) => [c.slug, c]));
  const brandBySlug = new Map(brandList.map((b) => [b.slug, b]));

  const products: Product[] = rows.map((r, i) => {
    const catSlugs = r.categorySlugs.split(",").filter(Boolean);
    const cats = catSlugs.map((s) => {
      const c = catBySlug.get(s);
      return c ? { id: c.id, name: c.name, slug: c.slug } : { id: 0, name: s, slug: s };
    });
    const brand = r.brandSlug && brandBySlug.has(r.brandSlug)
      ? { id: brandBySlug.get(r.brandSlug)!.id, name: brandBySlug.get(r.brandSlug)!.name, slug: r.brandSlug }
      : null;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      sku: r.sku,
      price: r.price / 100,
      regular: r.regularPrice ? r.regularPrice / 100 : null,
      priceFmt: ghs(r.price),
      regularFmt: r.regularPrice ? ghs(r.regularPrice) : null,
      onSale: r.onSale,
      discount: r.discount,
      image: r.image,
      gallery: r.image ? [r.image] : [],
      categories: cats,
      brand,
      shortDescription: r.shortDescription,
      description: r.description,
      averageRating: r.averageRating,
      reviewCount: r.reviewCount,
      inStock: r.stock > 0,
    };
  });

  /* keep category counts in sync with the live product list */
  for (const c of catList) {
    c.count = products.filter((p) => p.categories.some((pc) => pc.slug === c.slug)).length;
  }

  const pages: Page[] = staticBase.pages.map((p, i) => ({ id: i + 1, slug: p.slug, title: p.title, content: p.content }));

  return {
    generatedAt: new Date().toISOString(),
    products,
    categories: catList,
    pages,
    categoriesBySlug: Object.fromEntries(catList.map((c) => [c.slug, c])),
    productsBySlug: Object.fromEntries(products.map((p) => [p.slug, p])),
    brands: brandList,
    brandsBySlug: Object.fromEntries(brandList.map((b) => [b.slug, b])),
    pagesBySlug: Object.fromEntries(pages.map((p) => [p.slug, p])),
    homeSections: staticBase.homeSections,
  };
}

/* rebuilt: char-slug fix */
