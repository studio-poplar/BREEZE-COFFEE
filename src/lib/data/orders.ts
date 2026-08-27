import { NeonDbError } from "@neondatabase/serverless";
import { sql } from "@/lib/db";
import { newId, newOrderToken } from "@/lib/ids";
import { getMenuItems } from "@/lib/data/menu";
import type { Order, OrderItem, SelectedOption, OrderStatus, PaymentMethod } from "@/lib/types";

export interface CreateOrderLine {
  item_id: string;
  qty: number;
  /** choice_ids the customer picked; prices are re-derived server-side, never trusted from the client. */
  choice_ids: string[];
}

export class OrderCreateError extends Error {}

function rowToOrder(row: Record<string, unknown>): Omit<Order, "items"> {
  return {
    order_id: row.order_id as string,
    order_token: row.order_token as string,
    store_id: row.store_id as string,
    customer_id: row.customer_id as string,
    status: row.status as OrderStatus,
    payment_method: (row.payment_method as PaymentMethod) ?? null,
    total_price: row.total_price as number,
    created_at: row.created_at as string,
    paid_at: (row.paid_at as string) ?? null,
    served_at: (row.served_at as string) ?? null,
  };
}

async function loadItems(orderId: string): Promise<OrderItem[]> {
  const rows = (await sql`
    SELECT * FROM order_items WHERE order_id = ${orderId}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    order_item_id: r.order_item_id as string,
    order_id: r.order_id as string,
    item_id: r.item_id as string,
    item_name_snapshot: r.item_name_snapshot as string,
    unit_price: r.unit_price as number,
    qty: r.qty as number,
    selected_options: JSON.parse(r.selected_options as string) as SelectedOption[],
  }));
}

export async function getOrderByToken(token: string): Promise<Order | undefined> {
  const rows = (await sql`SELECT * FROM orders WHERE order_token = ${token}`) as Record<
    string,
    unknown
  >[];
  if (!rows[0]) return undefined;
  const order = rowToOrder(rows[0]);
  return { ...order, items: await loadItems(order.order_id) };
}

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const rows = (await sql`
    SELECT * FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `) as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (row) => {
      const order = rowToOrder(row);
      return { ...order, items: await loadItems(order.order_id) };
    })
  );
}

const MAX_TOKEN_ATTEMPTS = 5;

export async function createOrder(
  storeId: string,
  customerId: string,
  lines: CreateOrderLine[]
): Promise<Order> {
  if (lines.length === 0) throw new OrderCreateError("カートが空です");

  const itemIds = [...new Set(lines.map((l) => l.item_id))];
  const menuById = await getMenuItems(itemIds);

  let total = 0;
  const preparedItems: {
    order_item_id: string;
    item_id: string;
    item_name_snapshot: string;
    unit_price: number;
    qty: number;
    selected_options: SelectedOption[];
  }[] = [];

  for (const line of lines) {
    const menuItem = menuById.get(line.item_id);
    if (!menuItem || menuItem.store_id !== storeId || !menuItem.active) {
      throw new OrderCreateError(`注文できない商品が含まれています: ${line.item_id}`);
    }
    if (!Number.isInteger(line.qty) || line.qty < 1) {
      throw new OrderCreateError("数量が不正です");
    }

    const selected: SelectedOption[] = [];
    for (const group of menuItem.option_groups) {
      const pickedInGroup = group.choices.filter((c) => line.choice_ids.includes(c.choice_id));
      if (group.required && pickedInGroup.length === 0) {
        throw new OrderCreateError(`${menuItem.name}: 「${group.label}」を選択してください`);
      }
      if (!group.multi_select && pickedInGroup.length > 1) {
        throw new OrderCreateError(`${menuItem.name}: 「${group.label}」は1つだけ選択できます`);
      }
      for (const choice of pickedInGroup) {
        selected.push({
          group_label: group.label,
          choice_label: choice.label,
          extra_price: choice.extra_price,
        });
      }
    }

    const unitPrice = menuItem.price + selected.reduce((sum, o) => sum + o.extra_price, 0);
    total += unitPrice * line.qty;
    preparedItems.push({
      order_item_id: newId(),
      item_id: menuItem.item_id,
      item_name_snapshot: menuItem.name,
      unit_price: unitPrice,
      qty: line.qty,
      selected_options: selected,
    });
  }

  const order_id = newId();
  const createdAt = new Date().toISOString();

  // order_token is generated client-side and only ~1e12 possible values, so a
  // collision is astronomically unlikely — but since the HTTP driver can't do
  // an interactive "check, then insert" within one transaction, we instead
  // let the UNIQUE constraint catch it and retry with a fresh token.
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
    const order_token = newOrderToken();
    try {
      await sql.transaction((tx) => [
        tx`
          INSERT INTO orders (order_id, order_token, store_id, customer_id, status, total_price, created_at)
          VALUES (${order_id}, ${order_token}, ${storeId}, ${customerId}, 'unpaid', ${total}, ${createdAt})
        `,
        ...preparedItems.map(
          (item) => tx`
            INSERT INTO order_items (order_item_id, order_id, item_id, item_name_snapshot, unit_price, qty, selected_options)
            VALUES (${item.order_item_id}, ${order_id}, ${item.item_id}, ${item.item_name_snapshot},
              ${item.unit_price}, ${item.qty}, ${JSON.stringify(item.selected_options)})
          `
        ),
      ]);
      return (await getOrderByToken(order_token))!;
    } catch (err) {
      const isTokenCollision = err instanceof NeonDbError && err.code === "23505";
      if (isTokenCollision && attempt < MAX_TOKEN_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  throw new OrderCreateError("注文番号の生成に失敗しました。もう一度お試しください");
}

export async function markOrderPaid(
  token: string,
  paymentMethod: PaymentMethod
): Promise<Order | undefined> {
  const order = await getOrderByToken(token);
  if (!order) return undefined;
  if (order.status !== "unpaid") return order;
  await sql`
    UPDATE orders SET status = 'paid', payment_method = ${paymentMethod}, paid_at = ${new Date().toISOString()}
    WHERE order_token = ${token}
  `;
  return getOrderByToken(token);
}

export interface ServeInput {
  order_item_id: string;
  served_options: SelectedOption[];
  served_by: string;
}

export async function markOrderServed(
  token: string,
  serves: ServeInput[]
): Promise<Order | undefined> {
  const order = await getOrderByToken(token);
  if (!order) return undefined;

  const servedAt = new Date().toISOString();
  await sql.transaction((tx) => [
    ...serves.map(
      (s) => tx`
        INSERT INTO serve_records (order_item_id, served_options, served_by, served_at)
        VALUES (${s.order_item_id}, ${JSON.stringify(s.served_options)}, ${s.served_by}, ${servedAt})
        ON CONFLICT (order_item_id) DO UPDATE SET
          served_options = excluded.served_options,
          served_by = excluded.served_by,
          served_at = excluded.served_at
      `
    ),
    tx`UPDATE orders SET status = 'served', served_at = ${servedAt} WHERE order_token = ${token}`,
  ]);

  return getOrderByToken(token);
}

export async function listOrdersForStore(storeId: string, status?: OrderStatus): Promise<Order[]> {
  const rows = (
    status
      ? await sql`
          SELECT * FROM orders WHERE store_id = ${storeId} AND status = ${status} ORDER BY created_at DESC
        `
      : await sql`
          SELECT * FROM orders WHERE store_id = ${storeId} ORDER BY created_at DESC
        `
  ) as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (row) => {
      const order = rowToOrder(row);
      return { ...order, items: await loadItems(order.order_id) };
    })
  );
}
