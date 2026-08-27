import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireStaff } from "@/lib/auth/staff";
import { newId } from "@/lib/ids";

// Vercel's filesystem isn't writable/persistent, so menu photos go to Vercel
// Blob instead of public/uploads. Requires a Blob store attached in the
// Vercel dashboard (Storage tab), which injects BLOB_READ_WRITE_TOKEN.
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
// Stays under Vercel's 4.5MB request body limit for server uploads.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const blob = await put(`menu-photos/${newId()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ path: blob.url }, { status: 201 });
}
