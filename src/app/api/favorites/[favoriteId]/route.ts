import { NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/auth/customer";
import { removeFavorite } from "@/lib/data/favorites";

export async function DELETE(req: Request, ctx: { params: Promise<{ favoriteId: string }> }) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { favoriteId } = await ctx.params;
  const removed = removeFavorite(customer.customer_id, favoriteId);
  if (!removed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
