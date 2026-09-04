import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStaffPassword } from "@/lib/data/staff";
import { createStaffSession } from "@/lib/auth/staff";

const bodySchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await verifyStaffPassword(parsed.data.username, parsed.data.password);
  if (result.status === "locked") {
    return NextResponse.json(
      { error: "locked", retry_after_minutes: result.retryAfterMinutes },
      { status: 429 }
    );
  }
  if (result.status === "invalid") {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { staff } = result;
  await createStaffSession({
    staffId: staff.staff_id,
    username: staff.username,
    displayName: staff.display_name,
    role: staff.role,
    storeIds: staff.store_ids,
  });

  return NextResponse.json({ staff });
}
