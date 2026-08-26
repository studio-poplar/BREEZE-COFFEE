import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Store } from "@/lib/types";

export function listStores(): Store[] {
  return db.prepare(`SELECT * FROM stores ORDER BY created_at DESC`).all() as Store[];
}

export function listActiveStores(): Store[] {
  return db
    .prepare(`SELECT * FROM stores WHERE active = 1 ORDER BY created_at DESC`)
    .all() as Store[];
}

export function getStore(storeId: string): Store | undefined {
  return db.prepare(`SELECT * FROM stores WHERE store_id = ?`).get(storeId) as Store | undefined;
}

export function createStore(input: {
  name: string;
  type: Store["type"];
  starts_at?: string | null;
  ends_at?: string | null;
}): Store {
  const store_id = newId();
  db.prepare(
    `INSERT INTO stores (store_id, name, type, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)`
  ).run(store_id, input.name, input.type, input.starts_at ?? null, input.ends_at ?? null);
  return getStore(store_id)!;
}

export function updateStore(
  storeId: string,
  input: Partial<Pick<Store, "name" | "type" | "starts_at" | "ends_at" | "active">>
): Store | undefined {
  const current = getStore(storeId);
  if (!current) return undefined;
  const next = { ...current, ...input };
  db.prepare(
    `UPDATE stores SET name = ?, type = ?, starts_at = ?, ends_at = ?, active = ? WHERE store_id = ?`
  ).run(next.name, next.type, next.starts_at, next.ends_at, next.active, storeId);
  return getStore(storeId);
}
