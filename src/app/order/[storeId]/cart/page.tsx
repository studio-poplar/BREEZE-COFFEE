"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/client/cart";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { apiFetch } from "@/lib/client/api";
import type { Order } from "@/lib/types";

export default function CartPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { lines, updateQty, total, clear } = useCart(storeId);
  const { getAuthToken, recordOrderMessage } = useCustomerAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOrder() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      // Fetched fresh rather than reusing the token captured when this page
      // loaded — the customer may have spent a few minutes browsing/customizing
      // before checking out, long enough for a cached LINE ID token to expire.
      const freshToken = await getAuthToken();
      if (!freshToken) throw new Error("ログインし直してから注文してください");
      const { order } = await apiFetch<{ order: Order }>("/api/orders", {
        method: "POST",
        token: freshToken,
        body: JSON.stringify({
          store_id: storeId,
          lines: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, choice_ids: l.choice_ids })),
        }),
      });
      const summary = order.items
        .map((i) => `・${i.item_name_snapshot} x${i.qty}`)
        .join("\n");
      await recordOrderMessage(`Breeze Coffee で注文しました\n${summary}\n合計 ¥${order.total_price.toLocaleString()}`);
      clear();
      router.push(`/order/${storeId}/ticket/${order.order_token}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message === "unauthenticated"
          ? "ログインの有効期限が切れました。画面を再読み込みしてからもう一度お試しください。"
          : message === "too_many_orders"
            ? "短時間に注文が集中しています。しばらくしてからもう一度お試しください。"
            : message || "注文に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-20 flex max-w-md flex-col items-center px-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8h12l-1 12.5H7L6 8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
        </span>
        <p className="mt-4 font-bold">カートは空です</p>
        <p className="mt-1 text-sm text-zinc-400">メニューから好きなドリンクを選んでみましょう</p>
        <Link href={`/order/${storeId}`} className="press mt-6 rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-white">
          メニューを見る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-5">
      <h1 className="mb-4 px-1 text-2xl font-bold tracking-tight">カート</h1>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.key} className="app-card rise-in flex items-center gap-3 p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              {line.image_path && (
                <Image src={line.image_path} alt={line.item_name} fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{line.item_name}</p>
              {line.selected_labels.length > 0 && (
                <p className="truncate text-xs text-zinc-400">
                  {line.selected_labels.map((o) => o.choice_label).join(" / ")}
                </p>
              )}
              <p className="mt-1 text-sm font-bold tabular-nums">¥{(line.unit_price * line.qty).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 p-1">
              <button
                onClick={() => updateQty(line.key, line.qty - 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-base shadow-sm"
                aria-label="減らす"
              >
                −
              </button>
              <span className="w-4 text-center text-sm font-bold tabular-nums">{line.qty}</span>
              <button
                onClick={() => updateQty(line.key, line.qty + 1)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-base shadow-sm"
                aria-label="増やす"
              >
                ＋
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="app-card mt-5 flex items-center justify-between p-4">
        <span className="text-sm font-medium text-zinc-500">合計（税込）</span>
        <span className="text-2xl font-bold tabular-nums">¥{total.toLocaleString()}</span>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={submitOrder}
        disabled={submitting}
        className="mt-4 w-full rounded-full bg-zinc-900 py-4 font-bold text-white shadow-float disabled:opacity-40"
      >
        {submitting ? "注文中..." : "この内容で注文する"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-400">お支払いはレジで承ります</p>
    </div>
  );
}
