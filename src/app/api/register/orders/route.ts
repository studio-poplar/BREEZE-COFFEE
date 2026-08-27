import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { listOrdersForStore } from "@/lib/data/orders";
import type { OrderStatus } from "@/lib/types";

export async function GET(req: Request) {
  const staff = await requireStaff("register");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const storeId = url.searchParams.get("store_id");
  const status = url.searchParams.get("status") as OrderStatus | null;
  if (!storeId) return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  if (staff.role !== "admin" && !staff.storeIds.includes(storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ orders: await listOrdersForStore(storeId, status ?? undefined) });
}
