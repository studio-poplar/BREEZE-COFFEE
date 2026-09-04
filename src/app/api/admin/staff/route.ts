import { NextResponse } from "next/server";
import { z } from "zod";
import { NeonDbError } from "@neondatabase/serverless";
import { requireStaff } from "@/lib/auth/staff";
import { createStaff, listStaff } from "@/lib/data/staff";

export async function GET() {
  const staff = await requireStaff("admin");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json({ staff: await listStaff() });
}

const bodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "半角英数字・._- のみ使用できます"),
  password: z.string().min(8, "8文字以上にしてください"),
  display_name: z.string().min(1).max(40),
  role: z.enum(["admin", "register"]),
  store_ids: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const requester = await requireStaff("admin");
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const staff = await createStaff(parsed.data);
    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    if (err instanceof NeonDbError && err.code === "23505") {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    throw err;
  }
}
