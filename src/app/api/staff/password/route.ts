import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth/staff";
import { changeStaffPassword, PasswordChangeError } from "@/lib/data/staff";

const bodySchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "8文字以上で入力してください"),
});

export async function PATCH(req: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await changeStaffPassword(
      session.staffId,
      parsed.data.current_password,
      parsed.data.new_password
    );
  } catch (err) {
    if (err instanceof PasswordChangeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
