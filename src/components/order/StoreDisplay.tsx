"use client";

import { useEffect, useState } from "react";
import type { Order, PaymentMethod } from "@/lib/types";

const STATUS_LABEL: Record<Order["status"], { label: string; className: string }> = {
  unpaid: { label: "ご注文内容", className: "bg-amber-50 text-amber-600" },
  paid: { label: "お会計済み", className: "bg-emerald-50 text-emerald-600" },
  served: { label: "お会計済み", className: "bg-emerald-50 text-emerald-600" },
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "現金",
  card: "カード",
  emoney: "電子マネー",
  qr: "QRコード決済",
};

const POLL_INTERVAL_MS = 2000;

export function StoreDisplay({ storeId, initialStoreName }: { storeId: string; initialStoreName: string }) {
  const [storeName, setStoreName] = useState(initialStoreName);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      fetch(`/api/store/${storeId}/display`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setStoreName(d.storeName ?? initialStoreName);
          setOrder(d.order ?? null);
        })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [storeId, initialStoreName]);

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl font-bold">{storeName}</p>
        <p className="mt-4 text-lg text-zinc-400">ご来店ありがとうございます</p>
      </div>
    );
  }

  const status = STATUS_LABEL[order.status];

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-10">
      <p className="text-center text-sm text-zinc-400">{storeName}</p>
      <p
        className={`mx-auto mt-3 rounded-full px-4 py-1.5 text-base font-bold ${status.className}`}
      >
        {status.label}
      </p>

      <ul className="mt-8 flex flex-1 flex-col gap-4 overflow-y-auto">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="flex items-start justify-between border-b border-zinc-100 pb-4">
            <div>
              <p className="text-xl font-bold">
                {item.item_name_snapshot}
                <span className="ml-2 text-base font-medium text-zinc-500">×{item.qty}</span>
              </p>
              {item.selected_options.length > 0 && (
                <p className="mt-1 text-sm text-zinc-400">
                  {item.selected_options.map((o) => o.choice_label).join(" / ")}
                </p>
              )}
            </div>
            <p className="shrink-0 text-xl font-bold tabular-nums">
              ¥{(item.unit_price * item.qty).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t-2 border-zinc-900 pt-4">
        <span className="text-2xl font-bold">合計</span>
        <span className="text-4xl font-bold tabular-nums">¥{order.total_price.toLocaleString()}</span>
      </div>

      {order.status !== "unpaid" && order.payment_method && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-50 px-4 py-3">
          <div className="flex justify-between text-base">
            <span className="text-zinc-500">お支払い方法</span>
            <span className="font-bold">{PAYMENT_LABEL[order.payment_method]}</span>
          </div>
          {order.payment_method === "cash" && order.received_amount != null && (
            <>
              <div className="flex justify-between text-base">
                <span className="text-zinc-500">お預かり</span>
                <span className="font-bold tabular-nums">¥{order.received_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-zinc-500">おつり</span>
                <span className="font-bold tabular-nums">
                  ¥{(order.received_amount - order.total_price).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
