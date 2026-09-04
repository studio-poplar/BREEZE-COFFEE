import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/stores";
import { getOrderByToken } from "@/lib/data/orders";

// Once paid, the display keeps showing the payment method / change for a
// couple of minutes so the customer can double-check it, then falls back to
// idle on its own — computed here from paid_at rather than needing a
// scheduled job to clear active_order_token (there's no persistent process
// to run one on Vercel's serverless functions).
const PAID_DISPLAY_WINDOW_MS = 2 * 60 * 1000;

// Public, unauthenticated: this backs a screen meant to sit at the counter
// facing customers, the same way the order ticket page is reachable by token
// alone — it only ever exposes order contents, never staff/payment internals.
export async function GET(_req: Request, ctx: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await ctx.params;
  const store = await getStore(storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const order = store.active_order_token ? await getOrderByToken(store.active_order_token) : undefined;
  const expired =
    order?.status !== "unpaid" &&
    order?.paid_at != null &&
    Date.now() - new Date(order.paid_at).getTime() > PAID_DISPLAY_WINDOW_MS;

  return NextResponse.json({ storeName: store.name, order: order && !expired ? order : null });
}
