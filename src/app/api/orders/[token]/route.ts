import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import {
  addOrderItem,
  getOrderByToken,
  markOrderPaid,
  markOrderServed,
  OrderCreateError,
  removeOrderItem,
  updateOrderItemQty,
} from "@/lib/data/orders";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order });
}

const payBody = z.object({
  action: z.literal("pay"),
  payment_method: z.enum(["cash", "card", "emoney", "qr"]),
  received_amount: z.number().int().min(0).optional(),
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

const addItemBody = z.object({
  action: z.literal("add_item"),
  item_id: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  choice_ids: z.array(z.string()).default([]),
});

const removeItemBody = z.object({
  action: z.literal("remove_item"),
  order_item_id: z.string().min(1),
});

const updateQtyBody = z.object({
  action: z.literal("update_qty"),
  order_item_id: z.string().min(1),
  qty: z.number().int().min(1).max(20),
});

const patchBody = z.union([payBody, serveBody, addItemBody, removeItemBody, updateQtyBody]);

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
    const order = await markOrderPaid(token, parsed.data.payment_method, parsed.data.received_amount ?? null);
    return NextResponse.json({ order });
  }

  if (
    parsed.data.action === "add_item" ||
    parsed.data.action === "remove_item" ||
    parsed.data.action === "update_qty"
  ) {
    if (existing.status !== "unpaid") {
      return NextResponse.json({ error: "already_paid" }, { status: 409 });
    }
    try {
      const order =
        parsed.data.action === "add_item"
          ? await addOrderItem(existing, {
              item_id: parsed.data.item_id,
              qty: parsed.data.qty,
              choice_ids: parsed.data.choice_ids,
            })
          : parsed.data.action === "remove_item"
            ? await removeOrderItem(existing, parsed.data.order_item_id)
            : await updateOrderItemQty(existing, parsed.data.order_item_id, parsed.data.qty);
      return NextResponse.json({ order });
    } catch (err) {
      if (err instanceof OrderCreateError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      throw err;
    }
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
