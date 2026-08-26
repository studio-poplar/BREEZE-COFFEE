"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  unpaid: "会計待ち",
  paid: "会計済み・提供待ち",
  served: "提供完了",
};

export function TicketView({ storeId, initialOrder }: { storeId: string; initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, order.order_token, { width: 220, margin: 1 });
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
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-8 text-center">
      <p className="mb-1 text-xs font-medium text-zinc-400">注文番号</p>
      <p className="mb-4 text-2xl font-bold tracking-widest">{order.order_token}</p>

      <canvas ref={canvasRef} className="rounded-lg border border-zinc-100 p-2" />

      <p
        className={`mt-4 rounded-full px-4 py-1 text-sm font-medium ${
          order.status === "unpaid"
            ? "bg-amber-50 text-amber-600"
            : order.status === "paid"
              ? "bg-blue-50 text-blue-600"
              : "bg-green-50 text-green-600"
        }`}
      >
        {STATUS_LABEL[order.status]}
      </p>

      <ul className="mt-6 w-full text-left">
        {order.items.map((item) => (
          <li key={item.order_item_id} className="flex justify-between border-b border-zinc-50 py-2 text-sm">
            <span>
              {item.item_name_snapshot} x{item.qty}
              {item.selected_options.length > 0 && (
                <span className="ml-1 text-xs text-zinc-400">
                  ({item.selected_options.map((o) => o.choice_label).join("/")})
                </span>
              )}
            </span>
            <span>¥{(item.unit_price * item.qty).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex w-full justify-between font-bold">
        <span>合計</span>
        <span>¥{order.total_price.toLocaleString()}</span>
      </div>

      <p className="mt-6 text-xs text-zinc-400">レジでこのQRコードを提示してください</p>

      <Link
        href={`/order/${storeId}`}
        className="mt-8 w-full rounded-full border border-zinc-900 py-3 font-medium"
      >
        もう一度注文する
      </Link>
    </div>
  );
}
