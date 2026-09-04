import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { setActiveOrder } from "@/lib/data/stores";

const bodySchema = z.object({
  store_id: z.string().min(1),
  order_token: z.string().nullable(),
});

export async function POST(req: Request) {
  const staff = await requireStaff("register");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (staff.role !== "admin" && !staff.storeIds.includes(parsed.data.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await setActiveOrder(parsed.data.store_id, parsed.data.order_token);
  return NextResponse.json({ ok: true });
}
