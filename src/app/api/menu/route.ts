import { NextResponse } from "next/server";
import { listMenu } from "@/lib/data/menu";

export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get("store_id");
  if (!storeId) {
    return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  }
  return NextResponse.json({ items: listMenu(storeId) });
}
