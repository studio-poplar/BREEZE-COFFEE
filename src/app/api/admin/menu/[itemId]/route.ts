import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { deleteMenuItem, getMenuItem, updateMenuItem } from "@/lib/data/menu";

function canAccessStore(staff: { role: string; storeIds: string[] }, storeId: string) {
  return staff.role === "admin" || staff.storeIds.includes(storeId);
}

const optionSchema = z.object({
  label: z.string().min(1),
  required: z.boolean(),
  multi_select: z.boolean(),
  choices: z.array(z.object({ label: z.string().min(1), extra_price: z.number().int() })),
});

const bodySchema = z.object({
  name: z.string().min(1).max(60),
  price: z.number().int().min(0),
  category: z.string().max(40).default(""),
  image_path: z.string().nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  option_groups: z.array(optionSchema).default([]),
});

export async function PUT(req: Request, ctx: { params: Promise<{ itemId: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { itemId } = await ctx.params;
  const existing = getMenuItem(itemId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessStore(staff, existing.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = updateMenuItem(itemId, parsed.data);
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ itemId: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { itemId } = await ctx.params;
  const existing = getMenuItem(itemId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!canAccessStore(staff, existing.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    deleteMenuItem(itemId);
  } catch {
    return NextResponse.json(
      { error: "has_orders", message: "注文履歴があるため削除できません。非公開にしてください。" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
