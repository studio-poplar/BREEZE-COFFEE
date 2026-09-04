import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCustomer } from "@/lib/auth/customer";
import {
  countRecentOrdersByCustomer,
  createOrder,
  OrderCreateError,
  listOrdersForCustomer,
} from "@/lib/data/orders";

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

// A real customer might place a couple of quick follow-up orders (forgot an
// item, ordering for a friend too), but this many in this short a window is
// a spam/abuse pattern, not normal cafe use.
const RATE_LIMIT_MAX_ORDERS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

export async function POST(req: Request) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const recentCount = await countRecentOrdersByCustomer(customer.customer_id, windowStart);
  if (recentCount >= RATE_LIMIT_MAX_ORDERS) {
    return NextResponse.json(
      { error: "too_many_orders", retry_after_minutes: RATE_LIMIT_WINDOW_MINUTES },
      { status: 429 }
    );
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
