import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { createMenuItem, listMenu } from "@/lib/data/menu";

function canAccessStore(staff: { role: string; storeIds: string[] }, storeId: string) {
  return staff.role === "admin" || staff.storeIds.includes(storeId);
}

export async function GET(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const storeId = new URL(req.url).searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  if (!canAccessStore(staff, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ items: listMenu(storeId, { includeInactive: true }) });
}

const optionSchema = z.object({
  label: z.string().min(1),
  required: z.boolean(),
  multi_select: z.boolean(),
  choices: z.array(z.object({ label: z.string().min(1), extra_price: z.number().int() })),
});

const bodySchema = z.object({
  store_id: z.string().min(1),
  name: z.string().min(1).max(60),
  price: z.number().int().min(0),
  category: z.string().max(40).default(""),
  image_path: z.string().nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  option_groups: z.array(optionSchema).default([]),
});

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!canAccessStore(staff, parsed.data.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { store_id, ...input } = parsed.data;
  const item = createMenuItem(store_id, input);
  return NextResponse.json({ item }, { status: 201 });
}
