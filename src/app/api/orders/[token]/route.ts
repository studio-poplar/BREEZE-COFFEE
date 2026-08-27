import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { getOrderByToken, markOrderPaid, markOrderServed } from "@/lib/data/orders";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order });
}

const payBody = z.object({
  action: z.literal("pay"),
  payment_method: z.enum(["cash", "card"]),
});

const serveBody = z.object({
  action: z.literal("serve"),
  serves: z.array(
    z.object({
      order_item_id: z.string(),
      served_options: z
        .array(
          z.object({
            group_label: z.string(),
            choice_label: z.string(),
            extra_price: z.number(),
          })
        )
        .default([]),
    })
  ),
});

const patchBody = z.union([payBody, serveBody]);

export async function PATCH(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const staff = await requireStaff("register");
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { token } = await ctx.params;
  const existing = await getOrderByToken(token);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (staff.role !== "admin" && !staff.storeIds.includes(existing.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "pay") {
    if (existing.status !== "unpaid") {
      return NextResponse.json({ error: "already_paid" }, { status: 409 });
    }
    const order = await markOrderPaid(token, parsed.data.payment_method);
    return NextResponse.json({ order });
  }

  if (existing.status !== "paid") {
    return NextResponse.json({ error: "not_paid_yet" }, { status: 409 });
  }
  const order = await markOrderServed(
    token,
    parsed.data.serves.map((s) => ({ ...s, served_by: staff.staffId }))
  );
  return NextResponse.json({ order });
}
