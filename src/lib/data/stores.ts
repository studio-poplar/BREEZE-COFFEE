import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Store } from "@/lib/types";

export async function listStores(): Promise<Store[]> {
  return (await sql`SELECT * FROM stores ORDER BY created_at DESC`) as Store[];
}

export async function listActiveStores(): Promise<Store[]> {
  return (await sql`
    SELECT * FROM stores WHERE active = true ORDER BY created_at DESC
  `) as Store[];
}

export async function getStore(storeId: string): Promise<Store | undefined> {
  const rows = (await sql`SELECT * FROM stores WHERE store_id = ${storeId}`) as Store[];
  return rows[0];
}

export async function createStore(input: {
  name: string;
  type: Store["type"];
  starts_at?: string | null;
  ends_at?: string | null;
}): Promise<Store> {
  const store_id = newId();
  await sql`
    INSERT INTO stores (store_id, name, type, starts_at, ends_at, created_at)
    VALUES (${store_id}, ${input.name}, ${input.type}, ${input.starts_at ?? null}, ${input.ends_at ?? null}, ${new Date().toISOString()})
  `;
  return (await getStore(store_id))!;
}

export async function updateStore(
  storeId: string,
  input: Partial<Pick<Store, "name" | "type" | "starts_at" | "ends_at" | "active">>
): Promise<Store | undefined> {
  const current = await getStore(storeId);
  if (!current) return undefined;
  const next = { ...current, ...input };
  await sql`
    UPDATE stores SET name = ${next.name}, type = ${next.type}, starts_at = ${next.starts_at},
      ends_at = ${next.ends_at}, active = ${next.active}
    WHERE store_id = ${storeId}
  `;
  return getStore(storeId);
}
