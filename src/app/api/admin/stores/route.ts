import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { createStore, listStores } from "@/lib/data/stores";

export async function GET() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const stores = await listStores();
  const visible = staff.role === "admin" ? stores : stores.filter((s) => staff.storeIds.includes(s.store_id));
  return NextResponse.json({ stores: visible });
}

const bodySchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["permanent", "popup"]),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const staff = await requireStaff("admin");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await createStore(parsed.data);
  return NextResponse.json({ store }, { status: 201 });
}
