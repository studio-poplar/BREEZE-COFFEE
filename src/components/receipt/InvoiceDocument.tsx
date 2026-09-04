"use client";

import { useState } from "react";
import type { Order, Store } from "@/lib/types";
import { formatReceiptDateTime, splitTax } from "@/lib/receipt";

export function InvoiceDocument({ order, store }: { order: Order; store: Store }) {
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("お品代として");
  const { exclusive, tax } = splitTax(order.total_price);
  const issuedAt = order.paid_at ?? order.created_at;

  return (
    <div className="mx-auto max-w-md px-4 py-6 print:px-0 print:py-0">
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 print:hidden">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">宛名</label>
          <div className="flex gap-2">
            <input
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="お客様のお名前"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPayee("上様")}
              className="shrink-0 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-500"
            >
              上様
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">但し書き</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[380px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <p className="mb-6 text-center text-xl font-bold tracking-widest">領収書</p>

        <div className="mb-6 flex items-end justify-between border-b-2 border-zinc-900 pb-2">
          <span className="text-lg">
            {payee || "＿＿＿＿＿＿＿＿＿"}
            {payee && payee !== "上様" && " 様"}
          </span>
        </div>

        <p className="mb-1 text-center text-3xl font-bold tabular-nums">¥{order.total_price.toLocaleString()}</p>
        <p className="mb-6 text-center text-xs text-zinc-400">
          (内消費税等10% ¥{tax.toLocaleString()} / 税抜金額 ¥{exclusive.toLocaleString()})
        </p>

        <div className="mb-6 flex justify-between border-b border-zinc-200 pb-2 text-sm">
          <span className="text-zinc-500">但し書き</span>
          <span>{description || "お品代として"}</span>
        </div>

        <div className="mb-8 flex justify-between text-sm">
          <span className="text-zinc-500">発行日</span>
          <span>{formatReceiptDateTime(issuedAt)}</span>
        </div>

        <div className="border-t border-zinc-200 pt-4 text-center">
          <p className="font-bold">{store.name}</p>
          {store.address && <p className="mt-0.5 text-xs text-zinc-500">{store.address}</p>}
          {store.phone && <p className="text-xs text-zinc-500">TEL {store.phone}</p>}
          {store.invoice_reg_no && (
            <p className="mt-1 text-xs text-zinc-400">登録番号 {store.invoice_reg_no}</p>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-400">注文番号 {order.order_token}</p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mx-auto mt-6 block w-full max-w-[380px] rounded-full bg-zinc-900 py-3 font-medium text-white print:hidden"
      >
        印刷する
      </button>
    </div>
  );
}
