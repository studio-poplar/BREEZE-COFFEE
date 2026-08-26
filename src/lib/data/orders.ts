import { db } from "@/lib/db";
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

function loadItems(orderId: string): OrderItem[] {
  const rows = db
    .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
    .all(orderId) as Record<string, unknown>[];
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

export function getOrderByToken(token: string): Order | undefined {
  const row = db.prepare(`SELECT * FROM orders WHERE order_token = ?`).get(token) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  const order = rowToOrder(row);
  return { ...order, items: loadItems(order.order_id) };
}

export function listOrdersForCustomer(customerId: string): Order[] {
  const rows = db
    .prepare(`SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC`)
    .all(customerId) as Record<string, unknown>[];
  return rows.map((row) => {
    const order = rowToOrder(row);
    return { ...order, items: loadItems(order.order_id) };
  });
}

export function createOrder(
  storeId: string,
  customerId: string,
  lines: CreateOrderLine[]
): Order {
  if (lines.length === 0) throw new OrderCreateError("カートが空です");

  const itemIds = [...new Set(lines.map((l) => l.item_id))];
  const menuById = getMenuItems(itemIds);

  let total = 0;
  const preparedItems: {
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
      item_id: menuItem.item_id,
      item_name_snapshot: menuItem.name,
      unit_price: unitPrice,
      qty: line.qty,
      selected_options: selected,
    });
  }

  const order_id = newId();
  let order_token = newOrderToken();

  const insertOrder = db.prepare(
    `INSERT INTO orders (order_id, order_token, store_id, customer_id, status, total_price)
     VALUES (?, ?, ?, ?, 'unpaid', ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_item_id, order_id, item_id, item_name_snapshot, unit_price, qty, selected_options)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const tokenExists = db.prepare(`SELECT 1 FROM orders WHERE order_token = ?`);

  const tx = db.transaction(() => {
    while (tokenExists.get(order_token)) order_token = newOrderToken();
    insertOrder.run(order_id, order_token, storeId, customerId, total);
    for (const item of preparedItems) {
      insertItem.run(
        newId(),
        order_id,
        item.item_id,
        item.item_name_snapshot,
        item.unit_price,
        item.qty,
        JSON.stringify(item.selected_options)
      );
    }
  });
  tx();

  return getOrderByToken(order_token)!;
}

export function markOrderPaid(token: string, paymentMethod: PaymentMethod): Order | undefined {
  const order = getOrderByToken(token);
  if (!order) return undefined;
  if (order.status !== "unpaid") return order;
  db.prepare(
    `UPDATE orders SET status = 'paid', payment_method = ?, paid_at = datetime('now') WHERE order_token = ?`
  ).run(paymentMethod, token);
  return getOrderByToken(token);
}

export interface ServeInput {
  order_item_id: string;
  served_options: SelectedOption[];
  served_by: string;
}

export function markOrderServed(token: string, serves: ServeInput[]): Order | undefined {
  const order = getOrderByToken(token);
  if (!order) return undefined;

  const insertServe = db.prepare(
    `INSERT OR REPLACE INTO serve_records (order_item_id, served_options, served_by)
     VALUES (?, ?, ?)`
  );
  const tx = db.transaction(() => {
    for (const s of serves) {
      insertServe.run(s.order_item_id, JSON.stringify(s.served_options), s.served_by);
    }
    db.prepare(
      `UPDATE orders SET status = 'served', served_at = datetime('now') WHERE order_token = ?`
    ).run(token);
  });
  tx();

  return getOrderByToken(token);
}

export function listOrdersForStore(storeId: string, status?: OrderStatus): Order[] {
  const rows = (
    status
      ? db
          .prepare(
            `SELECT * FROM orders WHERE store_id = ? AND status = ? ORDER BY created_at DESC`
          )
          .all(storeId, status)
      : db
          .prepare(`SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC`)
          .all(storeId)
  ) as Record<string, unknown>[];
  return rows.map((row) => {
    const order = rowToOrder(row);
    return { ...order, items: loadItems(order.order_id) };
  });
}
