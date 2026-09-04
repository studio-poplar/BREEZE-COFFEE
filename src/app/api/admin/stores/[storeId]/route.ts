import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { updateStore } from "@/lib/data/stores";

const bodySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  type: z.enum(["permanent", "popup"]).optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  invoice_reg_no: z.string().max(20).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ storeId: string }> }) {
  const staff = await requireStaff("admin");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { storeId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const store = await updateStore(storeId, parsed.data);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ store });
}
