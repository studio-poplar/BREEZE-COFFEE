"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QrScanner } from "@/components/register/QrScanner";
import type { Order, PaymentMethod, Store } from "@/lib/types";

const FLASH_MESSAGE: Record<string, string> = {
  paid: "会計を記録しました。次の注文をどうぞ。",
  served: "提供済みにしました。",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "現金",
  card: "カード",
  emoney: "電子マネー",
  qr: "QR決済",
};

const POLL_INTERVAL_MS = 2000;

type Tab = "unpaid" | "paid" | "served";

function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function OrderList({
  orders,
  emptyText,
  onSelect,
  showMeta,
}: {
  orders: Order[] | null;
  emptyText: string;
  onSelect: (token: string) => void;
  /** Served tab shows when + how it was paid, to help spot mistakes. */
  showMeta?: boolean;
}) {
  if (orders === null) return <p className="text-sm text-zinc-400">読み込み中...</p>;
  if (orders.length === 0) return <p className="text-sm text-zinc-400">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((o) => (
        <li key={o.order_id}>
          <button
            onClick={() => onSelect(o.order_token)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50"
          >
            <div>
              <span className="font-mono font-medium">{o.order_token}</span>
              {showMeta && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {formatTime(o.served_at)} 提供 ・{" "}
                  {o.payment_method ? PAYMENT_LABEL[o.payment_method] : "-"}
                </p>
              )}
            </div>
            <span className="text-sm text-zinc-500">
              {o.items.reduce((n, i) => n + i.qty, 0)}点 / ¥{o.total_price.toLocaleString()}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function RegisterScan({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState(stores[0]?.store_id ?? "");
  const [manualToken, setManualToken] = useState("");
  const [tab, setTab] = useState<Tab>("unpaid");
  const [unpaid, setUnpaid] = useState<Order[] | null>(null);
  const [awaitingServe, setAwaitingServe] = useState<Order[] | null>(null);
  const [served, setServed] = useState<Order[] | null>(null);
  const storeIdRef = useRef(storeId);
  useEffect(() => {
    storeIdRef.current = storeId;
  }, [storeId]);

  const flash = searchParams.get("flash");
  const flashMessage = flash ? FLASH_MESSAGE[flash] : null;

  function refresh() {
    const currentStoreId = storeIdRef.current;
    if (!currentStoreId) return;
    fetch(`/api/register/orders?store_id=${currentStoreId}&status=unpaid`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUnpaid(d.orders ?? []));
    fetch(`/api/register/orders?store_id=${currentStoreId}&status=paid`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAwaitingServe(d.orders ?? []));
    fetch(`/api/register/orders?store_id=${currentStoreId}&status=served`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setServed(d.orders ?? []));
  }

  useEffect(refresh, [storeId]);

  // Poll so other staff's payments/serves on other devices show up here without
  // a manual reload — pause while the tab is backgrounded and catch up
  // immediately when it becomes visible again instead of waiting out the timer.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Clear the flash message from the URL after a moment so a reload doesn't re-show it.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => router.replace("/register"), 4000);
    return () => clearTimeout(id);
  }, [flash, router]);

  function goToToken(token: string) {
    router.push(`/register/order/${token.trim().toUpperCase()}`);
  }

  const tabs: { key: Tab; label: string; orders: Order[] | null; emptyText: string }[] = [
    { key: "unpaid", label: "会計待ち", orders: unpaid, emptyText: "会計待ちの注文はありません" },
    { key: "paid", label: "提供待ち", orders: awaitingServe, emptyText: "提供待ちの注文はありません" },
    { key: "served", label: "提供済み", orders: served, emptyText: "提供済みの注文はまだありません" },
  ];

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Link href="/register/maker" className="mb-4 inline-block text-xs text-zinc-400 underline">
        メイク画面はこちら →
      </Link>

      {flashMessage && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-600">
          {flashMessage}
        </p>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-xs text-zinc-500">対応する店舗</label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <QrScanner onDetect={goToToken} />

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manualToken.trim()) goToToken(manualToken);
        }}
      >
        <input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder="注文番号を入力"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 uppercase tracking-widest"
          maxLength={8}
        />
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white">
          確認
        </button>
      </form>

      <div className="mt-8">
        <div className="mb-3 flex rounded-lg bg-zinc-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
              }`}
            >
              {t.label}
              {t.orders && t.orders.length > 0 && t.key !== "served" && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  {t.orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tabs.map(
          (t) =>
            tab === t.key && (
              <OrderList
                key={t.key}
                orders={t.orders}
                emptyText={t.emptyText}
                onSelect={goToToken}
                showMeta={t.key === "served"}
              />
            )
        )}
      </div>
    </div>
  );
}
