import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import { listMenu } from "@/lib/data/menu";
import type { Favorite, ResolvedFavorite, SelectedOption } from "@/lib/types";

function rowToFavorite(row: Record<string, unknown>): Favorite {
  return {
    favorite_id: row.favorite_id as string,
    customer_id: row.customer_id as string,
    item_id: (row.item_id as string) ?? null,
    item_name: row.item_name as string,
    label: row.label as string,
    selected_options: JSON.parse(row.selected_options as string) as SelectedOption[],
    created_at: row.created_at as string,
  };
}

export async function listFavoritesForCustomer(customerId: string): Promise<Favorite[]> {
  const rows = (await sql`
    SELECT * FROM favorites WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return rows.map(rowToFavorite);
}

/** Favorites for this customer that this store's current menu can actually fulfil. */
export async function listFavoritesForStore(
  customerId: string,
  storeId: string
): Promise<ResolvedFavorite[]> {
  const favorites = await listFavoritesForCustomer(customerId);
  const menu = await listMenu(storeId);
  const byName = new Map(menu.map((m) => [m.name, m]));

  return favorites
    .map((f) => ({ ...f, current_item: byName.get(f.item_name) ?? null }))
    .filter((f) => f.current_item !== null);
}

export async function addFavorite(
  customerId: string,
  input: { item_id: string; item_name: string; label: string; selected_options: SelectedOption[] }
): Promise<Favorite> {
  const favorite_id = newId();
  await sql`
    INSERT INTO favorites (favorite_id, customer_id, item_id, item_name, label, selected_options, created_at)
    VALUES (${favorite_id}, ${customerId}, ${input.item_id}, ${input.item_name}, ${input.label},
      ${JSON.stringify(input.selected_options)}, ${new Date().toISOString()})
  `;
  const rows = (await sql`
    SELECT * FROM favorites WHERE favorite_id = ${favorite_id}
  `) as Record<string, unknown>[];
  return rowToFavorite(rows[0]);
}

export async function removeFavorite(customerId: string, favoriteId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM favorites WHERE favorite_id = ${favoriteId} AND customer_id = ${customerId}
    RETURNING favorite_id
  `;
  return deleted.length > 0;
}
