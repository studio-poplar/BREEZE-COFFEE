import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCustomer } from "@/lib/auth/customer";
import { addFavorite, listFavoritesForCustomer, listFavoritesForStore } from "@/lib/data/favorites";
import { getMenuItem } from "@/lib/data/menu";

export async function GET(req: Request) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const storeId = new URL(req.url).searchParams.get("store_id");
  const favorites = storeId
    ? listFavoritesForStore(customer.customer_id, storeId)
    : listFavoritesForCustomer(customer.customer_id);
  return NextResponse.json({ favorites });
}

const bodySchema = z.object({
  item_id: z.string().min(1),
  label: z.string().min(1).max(60),
  selected_options: z
    .array(
      z.object({
        group_label: z.string(),
        choice_label: z.string(),
        extra_price: z.number(),
      })
    )
    .default([]),
});

export async function POST(req: Request) {
  const customer = await authenticateCustomer(req);
  if (!customer) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = getMenuItem(parsed.data.item_id);
  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  const favorite = addFavorite(customer.customer_id, {
    item_id: item.item_id,
    item_name: item.name,
    label: parsed.data.label,
    selected_options: parsed.data.selected_options,
  });
  return NextResponse.json({ favorite }, { status: 201 });
}
