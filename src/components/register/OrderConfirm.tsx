"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order, PaymentMethod } from "@/lib/types";

export function OrderConfirm({ initialOrder: order }: { initialOrder: Order }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedIds, setServedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  async function pay(method: PaymentMethod) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.order_token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", payment_method: method }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError("会計処理に失敗しました");
    }
    // Pay and serve are separate steps now: as soon as payment is recorded,
    // the register is free to take the next customer. Serving happens later
    // from the "提供待ちの注文" list, independently.
    router.push("/register?flash=paid");
  }

  async function serve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.order_token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "serve",
        serves: order.items.map((item) => ({
          order_item_id: item.order_item_id,
          served_options: item.selected_options,
        })),
      }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError("提供記録に失敗しました");
    }
    router.push("/register?flash=served");
  }

  const allServed = order.items.every((i) => servedIds.has(i.order_item_id));

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="mb-1 text-xs text-zinc-400">注文番号</p>
      <p className="mb-4 text-2xl font-bold tracking-widest">{order.order_token}</p>

      <ul className="mb-4 flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {item.item_name_snapshot} x{item.qty}
                </p>
                {item.selected_options.length > 0 && (
                  <p className="text-xs text-zinc-400">
                    {item.selected_options.map((o) => o.choice_label).join(" / ")}
                  </p>
                )}
              </div>
              <p className="text-sm text-zinc-600">¥{(item.unit_price * item.qty).toLocaleString()}</p>
            </div>
            {order.status === "paid" && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={servedIds.has(item.order_item_id)}
                  onChange={(e) =>
                    setServedIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(item.order_item_id);
                      else next.delete(item.order_item_id);
                      return next;
                    })
                  }
                />
                提供済み
              </label>
            )}
          </li>
        ))}
      </ul>

      <div className="mb-4 flex justify-between border-t border-zinc-100 pt-3 font-bold">
        <span>合計</span>
        <span>¥{order.total_price.toLocaleString()}</span>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {order.status === "unpaid" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => pay("cash")}
            className="rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
          >
            現金で会計
          </button>
          <button
            disabled={busy}
            onClick={() => pay("card")}
            className="rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
          >
            カードで会計
          </button>
        </div>
      )}

      {order.status === "paid" && (
        <button
          disabled={busy || !allServed}
          onClick={serve}
          className="w-full rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
        >
          提供完了にする
        </button>
      )}

      {order.status === "served" && (
        <p className="rounded-lg bg-green-50 py-3 text-center text-sm font-medium text-green-600">
          対応完了
        </p>
      )}

      <button onClick={() => router.push("/register")} className="mt-4 w-full text-sm text-zinc-400">
        レジ画面に戻る
      </button>
    </div>
  );
}
