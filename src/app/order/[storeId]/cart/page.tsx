"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/client/cart";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { apiFetch } from "@/lib/client/api";
import type { Order } from "@/lib/types";

export default function CartPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { lines, updateQty, total, clear } = useCart(storeId);
  const { token, recordOrderMessage } = useCustomerAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOrder() {
    if (!token || lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { order } = await apiFetch<{ order: Order }>("/api/orders", {
        method: "POST",
        token,
        body: JSON.stringify({
          store_id: storeId,
          lines: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, choice_ids: l.choice_ids })),
        }),
      });
      const summary = order.items
        .map((i) => `・${i.item_name_snapshot} x${i.qty}`)
        .join("\n");
      await recordOrderMessage(`GROOVE COFFEE で注文しました\n${summary}\n合計 ¥${order.total_price.toLocaleString()}`);
      clear();
      router.push(`/order/${storeId}/ticket/${order.order_token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "注文に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return <p className="mt-16 text-center text-sm text-zinc-400">カートは空です</p>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.key} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{line.item_name}</p>
                {line.selected_labels.length > 0 && (
                  <p className="text-xs text-zinc-400">
                    {line.selected_labels.map((o) => o.choice_label).join(" / ")}
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-600">¥{line.unit_price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(line.key, line.qty - 1)}
                  className="h-7 w-7 rounded-full border border-zinc-300"
                >
                  −
                </button>
                <span className="w-5 text-center">{line.qty}</span>
                <button
                  onClick={() => updateQty(line.key, line.qty + 1)}
                  className="h-7 w-7 rounded-full border border-zinc-300"
                >
                  ＋
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <span className="font-medium">合計</span>
        <span className="text-lg font-bold">¥{total.toLocaleString()}</span>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <button
        onClick={submitOrder}
        disabled={submitting}
        className="mt-4 w-full rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
      >
        {submitting ? "注文中..." : "この内容で注文する"}
      </button>
    </div>
  );
}
