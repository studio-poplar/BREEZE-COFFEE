import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCustomer } from "@/lib/auth/customer";
import { createOrder, OrderCreateError, listOrdersForCustomer } from "@/lib/data/orders";

const bodySchema = z.object({
  store_id: z.string().min(1),
  lines: z
    .array(
      z.object({
        item_id: z.string().min(1),
        qty: z.number().int().min(1).max(20),
        choice_ids: z.array(z.string()).default([]),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await createOrder(parsed.data.store_id, customer.customer_id, parsed.data.lines);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderCreateError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

export async function GET(req: Request) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ orders: await listOrdersForCustomer(customer.customer_id) });
}
