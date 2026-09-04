import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { updateStaff } from "@/lib/data/staff";

const bodySchema = z.object({
  display_name: z.string().min(1).max(40).optional(),
  role: z.enum(["admin", "register"]).optional(),
  store_ids: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ staffId: string }> }) {
  const requester = await requireStaff("admin");
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { staffId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Deactivating the account you're currently logged in as would lock you
  // out with no other admin able to fix it — a small cafe often has just
  // the one admin account, so this guard is cheap insurance.
  if (staffId === requester.staffId && parsed.data.active === false) {
    return NextResponse.json({ error: "cannot_deactivate_self" }, { status: 400 });
  }

  const staff = await updateStaff(staffId, parsed.data);
  if (!staff) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ staff });
}
