import { db } from "@/lib/db";
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

export function listFavoritesForCustomer(customerId: string): Favorite[] {
  const rows = db
    .prepare(`SELECT * FROM favorites WHERE customer_id = ? ORDER BY created_at DESC`)
    .all(customerId) as Record<string, unknown>[];
  return rows.map(rowToFavorite);
}

/** Favorites for this customer that this store's current menu can actually fulfil. */
export function listFavoritesForStore(customerId: string, storeId: string): ResolvedFavorite[] {
  const favorites = listFavoritesForCustomer(customerId);
  const menu = listMenu(storeId);
  const byName = new Map(menu.map((m) => [m.name, m]));

  return favorites
    .map((f) => ({ ...f, current_item: byName.get(f.item_name) ?? null }))
    .filter((f) => f.current_item !== null);
}

export function addFavorite(
  customerId: string,
  input: { item_id: string; item_name: string; label: string; selected_options: SelectedOption[] }
): Favorite {
  const favorite_id = newId();
  db.prepare(
    `INSERT INTO favorites (favorite_id, customer_id, item_id, item_name, label, selected_options)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    favorite_id,
    customerId,
    input.item_id,
    input.item_name,
    input.label,
    JSON.stringify(input.selected_options)
  );
  return rowToFavorite(
    db.prepare(`SELECT * FROM favorites WHERE favorite_id = ?`).get(favorite_id) as Record<
      string,
      unknown
    >
  );
}

export function removeFavorite(customerId: string, favoriteId: string): boolean {
  const result = db
    .prepare(`DELETE FROM favorites WHERE favorite_id = ? AND customer_id = ?`)
    .run(favoriteId, customerId);
  return result.changes > 0;
}
