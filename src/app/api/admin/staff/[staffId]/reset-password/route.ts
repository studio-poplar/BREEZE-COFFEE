import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { findStaffById, resetStaffPassword } from "@/lib/data/staff";

const bodySchema = z.object({ new_password: z.string().min(8, "8文字以上にしてください") });

export async function POST(req: Request, ctx: { params: Promise<{ staffId: string }> }) {
  const requester = await requireStaff("admin");
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { staffId } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await findStaffById(staffId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await resetStaffPassword(staffId, parsed.data.new_password);
  return NextResponse.json({ ok: true });
}
