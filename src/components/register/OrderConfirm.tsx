"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegisterItemPicker } from "@/components/register/RegisterItemPicker";
import type { Order, PaymentMethod } from "@/lib/types";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "現金",
  card: "カード",
  emoney: "電子マネー(交通系)",
  qr: "QRコード決済",
};

const CASH_NOTES = [1000, 5000, 10000];

function CashPaymentPanel({
  total,
  busy,
  onCancel,
  onConfirm,
}: {
  total: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (received: number) => void;
}) {
  const [receivedInput, setReceivedInput] = useState(String(total));
  const received = Number(receivedInput);
  const validAmount = Number.isFinite(received) && received >= 0;
  const change = validAmount ? received - total : 0;
  const canConfirm = validAmount && change >= 0 && !busy;

  const quickAmounts = useMemo(() => {
    const values = [total, ...CASH_NOTES].filter((v) => v >= total);
    return [...new Set(values)].sort((a, b) => a - b);
  }, [total]);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <label className="mb-1 block text-xs text-zinc-500">お預かり金額</label>
      <input
        type="number"
        inputMode="numeric"
        value={receivedInput}
        onChange={(e) => setReceivedInput(e.target.value)}
        className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-right text-lg font-medium tabular-nums"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setReceivedInput(String(amount))}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm"
          >
            {amount === total ? "ちょうど" : `¥${amount.toLocaleString()}`}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5">
        <span className="text-sm text-zinc-500">おつり</span>
        {validAmount && change >= 0 ? (
          <span className="text-lg font-bold tabular-nums">¥{change.toLocaleString()}</span>
        ) : (
          <span className="text-sm font-medium text-red-500">
            {validAmount ? `¥${Math.abs(change).toLocaleString()} 不足しています` : "金額を入力してください"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 py-2.5 font-medium"
        >
          戻る
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm(received)}
          className="rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
        >
          会計を確定する
        </button>
      </div>
    </div>
  );
}

export function OrderConfirm({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedIds, setServedIds] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  // Lets the customer-facing display (a separate device polling this store)
  // mirror whichever order the register currently has open.
  useEffect(() => {
    fetch("/api/register/active-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: order.store_id, order_token: order.order_token }),
    });
    // Only on mount — the picker/qty edits below already push their own
    // updates to `order`, but re-announcing on every one of those isn't
    // needed since the token itself never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearActiveOrder() {
    fetch("/api/register/active-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: order.store_id, order_token: null }),
    });
  }

  function backToRegister() {
    clearActiveOrder();
    router.push("/register");
  }

  async function pay(method: PaymentMethod, receivedAmount?: number) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.order_token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pay",
        payment_method: method,
        ...(receivedAmount !== undefined ? { received_amount: receivedAmount } : {}),
      }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError("会計処理に失敗しました");
    }
    // Pay and serve are separate steps now: as soon as payment is recorded,
    // the register is free to take the next customer. Serving happens later
    // from the "提供待ちの注文" list, independently. The customer display
    // keeps showing this order's payment details for a couple of minutes
    // (see the /api/store/[storeId]/display route), so the active-order
    // marker is deliberately left in place here rather than cleared.
    router.push("/register?flash=paid");
  }

  async function updateQty(orderItemId: string, qty: number) {
    setEditingItemId(orderItemId);
    setError(null);
    const res = await fetch(`/api/orders/${order.order_token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_qty", order_item_id: orderItemId, qty }),
    });
    const data = await res.json().catch(() => null);
    setEditingItemId(null);
    if (!res.ok) return setError(data?.error ?? "数量の変更に失敗しました");
    setOrder(data.order);
  }

  async function removeItem(orderItemId: string) {
    setEditingItemId(orderItemId);
    setError(null);
    const res = await fetch(`/api/orders/${order.order_token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_item", order_item_id: orderItemId }),
    });
    const data = await res.json().catch(() => null);
    setEditingItemId(null);
    if (!res.ok) return setError(data?.error ?? "削除に失敗しました");
    setOrder(data.order);
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

      <ul className="mb-3 flex flex-col gap-2">
        {order.items.map((item) => {
          const editing = editingItemId === item.order_item_id;
          return (
            <li key={item.order_item_id} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="text-lg font-bold">{item.item_name_snapshot}</p>
                  <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-sm font-bold text-white">
                    ×{item.qty}
                  </span>
                </div>
                <p className="shrink-0 text-base font-semibold text-zinc-700">
                  ¥{(item.unit_price * item.qty).toLocaleString()}
                </p>
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

              {order.status === "unpaid" && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={editing || item.qty <= 1}
                      onClick={() => updateQty(item.order_item_id, item.qty - 1)}
                      className="h-9 w-9 rounded-full border-2 border-zinc-300 text-lg font-bold disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-base font-bold">{item.qty}</span>
                    <button
                      type="button"
                      disabled={editing}
                      onClick={() => updateQty(item.order_item_id, item.qty + 1)}
                      className="h-9 w-9 rounded-full border-2 border-zinc-300 text-lg font-bold disabled:opacity-30"
                    >
                      ＋
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={editing || order.items.length <= 1}
                    onClick={() => removeItem(item.order_item_id)}
                    className="text-sm font-medium text-red-400 underline disabled:opacity-30"
                  >
                    削除
                  </button>
                </div>
              )}

              {order.status === "paid" && (
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
              )}
            </li>
          );
        })}
      </ul>

      {order.status === "unpaid" && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="mb-4 w-full rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-500"
        >
          ＋ 商品を追加
        </button>
      )}

      <div className="mb-4 flex justify-between border-t border-zinc-100 pt-3 font-bold">
        <span>合計</span>
        <span>¥{order.total_price.toLocaleString()}</span>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {showPicker && (
        <RegisterItemPicker
          storeId={order.store_id}
          orderToken={order.order_token}
          onCancel={() => setShowPicker(false)}
          onAdded={(updated) => {
            setOrder(updated);
            setShowPicker(false);
          }}
        />
      )}

      {order.status === "unpaid" &&
        (selectedMethod === "cash" ? (
          <CashPaymentPanel
            total={order.total_price}
            busy={busy}
            onCancel={() => setSelectedMethod(null)}
            onConfirm={(received) => pay("cash", received)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((method) => (
              <button
                key={method}
                disabled={busy}
                onClick={() => (method === "cash" ? setSelectedMethod("cash") : pay(method))}
                className="rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
              >
                {METHOD_LABEL[method]}
              </button>
            ))}
          </div>
        ))}

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

      {order.status !== "unpaid" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href={`/register/order/${order.order_token}/receipt`}
            className="rounded-full border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-600"
          >
            レシートを発行
          </Link>
          <Link
            href={`/register/order/${order.order_token}/invoice`}
            className="rounded-full border border-zinc-300 py-2.5 text-center text-sm font-medium text-zinc-600"
          >
            領収書を発行
          </Link>
        </div>
      )}

      <button onClick={backToRegister} className="mt-4 w-full text-sm text-zinc-400">
        レジ画面に戻る
      </button>
    </div>
  );
}
