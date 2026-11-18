/* Product image upload → Vercel Blob (public URL). Requires a Blob store
   connected to the project (Vercel → Storage → Blob), which injects
   BLOB_READ_WRITE_TOKEN automatically. */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { requireStaff } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

export async function POST(req: NextRequest) {
  const g = await requireStaff("products:update", req);
  if (!g.ok) {
    /* creators without update rights can still upload for a new product */
    const c = await requireStaff("products:create", req);
    if (!c.ok) return g.res;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image upload isn't configured yet (connect a Vercel Blob store). You can paste an image URL instead.", code: "NOT_CONFIGURED" }, { status: 501 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG, WebP, AVIF or GIF image" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is larger than 4 MB — please compress it" }, { status: 413 });

  try {
    const name = `products/${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
    const blob = await put(name, file, { access: "public", contentType: file.type, addRandomSuffix: false });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("upload", e);
    return NextResponse.json({ error: "Upload failed, please try again" }, { status: 502 });
  }
}
