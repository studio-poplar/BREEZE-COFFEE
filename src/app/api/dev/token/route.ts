import { NextResponse } from "next/server";
import { z } from "zod";
import { devAuthEnabled, mintDevCustomerToken } from "@/lib/auth/customer";

// Stands in for LIFF login while no real LINE Login channel is configured.
// Automatically disabled the moment NEXT_PUBLIC_LIFF_ID is set (see
// devAuthEnabled), so it can never ship live in place of the real thing.
const bodySchema = z.object({ display_name: z.string().min(1).max(40) });

export async function POST(req: Request) {
  if (!devAuthEnabled()) {
    return NextResponse.json({ error: "dev_auth_disabled" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const token = await mintDevCustomerToken(parsed.data.display_name);
  return NextResponse.json({ token });
}
