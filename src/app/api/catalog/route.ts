import { NextResponse } from "next/server";
import { buildCatalog } from "@/lib/catalog-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await buildCatalog();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("catalog error", e);
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
