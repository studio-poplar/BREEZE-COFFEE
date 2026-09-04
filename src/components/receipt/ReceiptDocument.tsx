"use client";

import type { Order, PaymentMethod, Store } from "@/lib/types";
import { formatReceiptDateTime, splitTax } from "@/lib/receipt";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "現金",
  card: "カード",
  emoney: "電子マネー",
  qr: "QRコード決済",
};

export function ReceiptDocument({ order, store }: { order: Order; store: Store }) {
  const { exclusive, tax } = splitTax(order.total_price);
  const issuedAt = order.paid_at ?? order.created_at;

  return (
    <div className="mx-auto max-w-md px-4 py-6 print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-zinc-200 bg-white p-5 text-sm shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-4 text-center">
          <p className="text-base font-bold">{store.name}</p>
          {store.address && <p className="mt-0.5 text-xs text-zinc-500">{store.address}</p>}
          {store.phone && <p className="text-xs text-zinc-500">TEL {store.phone}</p>}
        </div>

        <p className="mb-1 text-center text-lg font-bold tracking-widest">レシート</p>
        <div className="mb-3 flex justify-between text-xs text-zinc-500">
          <span>{formatReceiptDateTime(issuedAt)}</span>
          <span>No. {order.order_token}</span>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-3">
          {order.items.map((item) => (
            <div key={item.order_item_id} className="mb-2">
              <div className="flex justify-between">
                <span>{item.item_name_snapshot}</span>
                <span className="tabular-nums">¥{(item.unit_price * item.qty).toLocaleString()}</span>
              </div>
              <p className="text-xs text-zinc-400">
                {item.selected_options.length > 0 && `${item.selected_options.map((o) => o.choice_label).join("/")} `}
                ¥{item.unit_price.toLocaleString()} × {item.qty}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-3">
          <div className="flex justify-between font-bold">
            <span>合計</span>
            <span className="tabular-nums">¥{order.total_price.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-zinc-400">
            <span>(内消費税等 10%対象 ¥{exclusive.toLocaleString()})</span>
            <span className="tabular-nums">¥{tax.toLocaleString()}</span>
          </div>
          {order.payment_method && (
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>お支払い方法</span>
              <span>{PAYMENT_LABEL[order.payment_method]}</span>
            </div>
          )}
        </div>

        {store.invoice_reg_no && (
          <p className="mt-4 text-center text-[10px] text-zinc-400">登録番号 {store.invoice_reg_no}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mx-auto mt-6 block w-full max-w-[320px] rounded-full bg-zinc-900 py-3 font-medium text-white print:hidden"
      >
        印刷する
      </button>
    </div>
  );
}
