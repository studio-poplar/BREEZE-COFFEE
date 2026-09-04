"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/types";

// Deliberately separate from OrderConfirm: this is the maker/barista screen,
// which only ever marks items served — it never touches payment and never
// announces itself to the customer-facing display (see OrderConfirm's mount
// effect), so a maker opening orders to work through the queue doesn't hijack
// what the cashier's device is currently showing there.
export function MakerOrderView({ initialOrder }: { initialOrder: Order }) {
  const [order] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedIds, setServedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

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
    router.push("/register/maker");
  }

  const allServed = order.items.every((i) => servedIds.has(i.order_item_id));

  if (order.status !== "paid") {
    return (
      <div className="mx-auto max-w-md px-4 py-6 text-center">
        <p className="mb-1 text-xs text-zinc-400">注文番号</p>
        <p className="mb-6 text-2xl font-bold tracking-widest">{order.order_token}</p>
        <p className="rounded-lg bg-green-50 py-3 text-sm font-medium text-green-600">対応完了</p>
        <button
          onClick={() => router.push("/register/maker")}
          className="mt-6 w-full text-sm text-zinc-400"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <p className="mb-1 text-xs text-zinc-400">注文番号</p>
      <p className="mb-4 text-2xl font-bold tracking-widest">{order.order_token}</p>

      <ul className="mb-4 flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <p className="text-lg font-bold">{item.item_name_snapshot}</p>
                <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-sm font-bold text-white">
                  ×{item.qty}
                </span>
              </div>
            </div>
            {item.selected_options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.selected_options.map((o, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-semibold text-zinc-700"
                  >
                    {o.choice_label}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setServedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.order_item_id)) next.delete(item.order_item_id);
                  else next.add(item.order_item_id);
                  return next;
                })
              }
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold transition-colors ${
                servedIds.has(item.order_item_id)
                  ? "bg-emerald-600 text-white"
                  : "border-2 border-zinc-300 text-zinc-400"
              }`}
            >
              {servedIds.has(item.order_item_id) ? "✓ 提供済み" : "提供済みにする"}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <button
        disabled={busy || !allServed}
        onClick={serve}
        className="w-full rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
      >
        提供完了にする
      </button>

      <button onClick={() => router.push("/register/maker")} className="mt-4 w-full text-sm text-zinc-400">
        一覧に戻る
      </button>
    </div>
  );
}
