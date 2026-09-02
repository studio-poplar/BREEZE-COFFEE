import { sql } from "@/lib/db";
import type { PaymentMethod } from "@/lib/types";

export interface SalesSummary {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface PaymentBreakdown {
  paymentMethod: PaymentMethod;
  orderCount: number;
  revenue: number;
}

export interface ItemRanking {
  itemName: string;
  qty: number;
  revenue: number;
}

export interface DailyRevenue {
  date: string; // YYYY-MM-DD, JST calendar day
  revenue: number;
}

export interface SalesReport {
  summary: SalesSummary;
  byPaymentMethod: PaymentBreakdown[];
  topItems: ItemRanking[];
  daily: DailyRevenue[];
}

/**
 * `from`/`to` are JST calendar dates (YYYY-MM-DD), `to` inclusive. Sales are
 * counted by paid_at (money actually collected), not created_at — an order
 * still sitting unpaid isn't revenue yet. Every timestamp in the DB is a
 * plain UTC ISO string, so day boundaries are computed here as the UTC
 * instants that correspond to JST midnight, and daily grouping converts
 * back to JST so a late-night order lands on the right day.
 */
function jstDayBounds(from: string, to: string): { fromUtc: string; toUtc: string } {
  const fromUtc = new Date(`${from}T00:00:00+09:00`).toISOString();
  const toDate = new Date(`${to}T00:00:00+09:00`);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  return { fromUtc, toUtc: toDate.toISOString() };
}

export async function getSalesReport(storeId: string, from: string, to: string): Promise<SalesReport> {
  const { fromUtc, toUtc } = jstDayBounds(from, to);

  const [summaryRows, paymentRows, itemRows, dailyRows] = await Promise.all([
    sql`
      SELECT COUNT(*) AS order_count, COALESCE(SUM(total_price), 0) AS total_revenue
      FROM orders
      WHERE store_id = ${storeId} AND status IN ('paid', 'served')
        AND paid_at >= ${fromUtc} AND paid_at < ${toUtc}
    `,
    sql`
      SELECT payment_method, COUNT(*) AS order_count, COALESCE(SUM(total_price), 0) AS revenue
      FROM orders
      WHERE store_id = ${storeId} AND status IN ('paid', 'served')
        AND paid_at >= ${fromUtc} AND paid_at < ${toUtc}
      GROUP BY payment_method
      ORDER BY revenue DESC
    `,
    sql`
      SELECT oi.item_name_snapshot AS item_name, SUM(oi.qty) AS qty, SUM(oi.unit_price * oi.qty) AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.store_id = ${storeId} AND o.status IN ('paid', 'served')
        AND o.paid_at >= ${fromUtc} AND o.paid_at < ${toUtc}
      GROUP BY oi.item_name_snapshot
      ORDER BY revenue DESC
      LIMIT 10
    `,
    sql`
      SELECT to_char((paid_at::timestamptz AT TIME ZONE 'Asia/Tokyo')::date, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(total_price), 0) AS revenue
      FROM orders
      WHERE store_id = ${storeId} AND status IN ('paid', 'served')
        AND paid_at >= ${fromUtc} AND paid_at < ${toUtc}
      GROUP BY day
      ORDER BY day
    `,
  ]);

  const summaryRow = summaryRows[0] as { order_count: string; total_revenue: string };
  const orderCount = Number(summaryRow.order_count);
  const totalRevenue = Number(summaryRow.total_revenue);

  return {
    summary: {
      totalRevenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0,
    },
    byPaymentMethod: (paymentRows as { payment_method: PaymentMethod; order_count: string; revenue: string }[]).map(
      (r) => ({ paymentMethod: r.payment_method, orderCount: Number(r.order_count), revenue: Number(r.revenue) })
    ),
    topItems: (itemRows as { item_name: string; qty: string; revenue: string }[]).map((r) => ({
      itemName: r.item_name,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    })),
    daily: (dailyRows as { day: string; revenue: string }[]).map((r) => ({
      date: r.day,
      revenue: Number(r.revenue),
    })),
  };
}
