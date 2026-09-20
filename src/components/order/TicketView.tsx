"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  unpaid: "会計待ち",
  paid: "お作りしています",
  served: "提供完了",
};

const STATUS_HINT: Record<OrderStatus, string> = {
  unpaid: "レジでこのQRコードをご提示ください",
  paid: "できあがるまで少々お待ちください",
  served: "ご来店ありがとうございました",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  unpaid: "bg-amber-50 text-amber-700",
  paid: "bg-brand-50 text-brand-700",
  served: "bg-zinc-100 text-zinc-600",
};

export function TicketView({ storeId, initialOrder }: { storeId: string; initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, order.order_token, {
        width: 208,
        margin: 0,
        color: { dark: "#2a211b", light: "#ffffff" },
      });
    }
  }, [order.order_token]);

  useEffect(() => {
    if (order.status === "served") return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/orders/${order.order_token}`);
      if (res.ok) {
        const { order: fresh } = await res.json();
        setOrder(fresh);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [order.status, order.order_token]);

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-5">
      <div className="app-card rise-in overflow-hidden">
        <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${STATUS_STYLE[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
          <p className="mt-5 text-[11px] font-semibold tracking-[0.2em] text-zinc-400">ORDER NUMBER</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.18em]">{order.order_token}</p>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
            <canvas ref={canvasRef} className="block" />
          </div>
          <p className="mt-4 text-xs text-zinc-400">{STATUS_HINT[order.status]}</p>
        </div>

        {/* ticket perforation */}
        <div className="relative">
          <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[var(--background)]" />
          <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[var(--background)]" />
          <div className="mx-6 border-t-2 border-dashed border-zinc-200" />
        </div>

        <div className="px-6 pb-6 pt-5">
          <ul>
            {order.items.map((item) => (
              <li key={item.order_item_id} className="flex justify-between gap-3 py-1.5 text-sm">
                <span>
                  <span className="font-medium">{item.item_name_snapshot}</span>
                  <span className="ml-1 text-zinc-400">×{item.qty}</span>
                  {item.selected_options.length > 0 && (
                    <span className="block text-xs text-zinc-400">
                      {item.selected_options.map((o) => o.choice_label).join(" / ")}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">¥{(item.unit_price * item.qty).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-zinc-100 pt-3">
            <span className="text-sm font-medium text-zinc-500">合計</span>
            <span className="text-2xl font-bold tabular-nums">¥{order.total_price.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {order.status !== "unpaid" && (
          <Link
            href={`/order/${storeId}/receipt/${order.order_token}`}
            className="press rounded-full border border-zinc-300 bg-white py-3 text-center text-sm font-medium text-zinc-700"
          >
            レシートを見る
          </Link>
        )}
        <Link
          href={`/order/${storeId}`}
          className="press rounded-full bg-zinc-900 py-3.5 text-center font-bold text-white"
        >
          もう一度注文する
        </Link>
      </div>
    </div>
  );
}
