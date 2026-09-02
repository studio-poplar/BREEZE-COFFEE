"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrScanner } from "@/components/register/QrScanner";
import type { Order, Store } from "@/lib/types";

const FLASH_MESSAGE: Record<string, string> = {
  paid: "会計を記録しました。次の注文をどうぞ。",
  served: "提供済みにしました。",
};

function OrderList({
  title,
  orders,
  emptyText,
  onSelect,
}: {
  title: string;
  orders: Order[] | null;
  emptyText: string;
  onSelect: (token: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">{title}</h2>
      {orders === null && <p className="text-sm text-zinc-400">読み込み中...</p>}
      {orders?.length === 0 && <p className="text-sm text-zinc-400">{emptyText}</p>}
      <ul className="flex flex-col gap-2">
        {orders?.map((o) => (
          <li key={o.order_id}>
            <button
              onClick={() => onSelect(o.order_token)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50"
            >
              <span className="font-mono font-medium">{o.order_token}</span>
              <span className="text-sm text-zinc-500">
                {o.items.reduce((n, i) => n + i.qty, 0)}点 / ¥{o.total_price.toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RegisterScan({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState(stores[0]?.store_id ?? "");
  const [manualToken, setManualToken] = useState("");
  const [unpaid, setUnpaid] = useState<Order[] | null>(null);
  const [awaitingServe, setAwaitingServe] = useState<Order[] | null>(null);

  const flash = searchParams.get("flash");
  const flashMessage = flash ? FLASH_MESSAGE[flash] : null;

  function refresh() {
    if (!storeId) return;
    fetch(`/api/register/orders?store_id=${storeId}&status=unpaid`)
      .then((r) => r.json())
      .then((d) => setUnpaid(d.orders ?? []));
    fetch(`/api/register/orders?store_id=${storeId}&status=paid`)
      .then((r) => r.json())
      .then((d) => setAwaitingServe(d.orders ?? []));
  }

  useEffect(refresh, [storeId]);

  // Clear the flash message from the URL after a moment so a reload doesn't re-show it.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => router.replace("/register"), 4000);
    return () => clearTimeout(id);
  }, [flash, router]);

  function goToToken(token: string) {
    router.push(`/register/order/${token.trim().toUpperCase()}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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

      <div className="mt-8 flex flex-col gap-8">
        <OrderList
          title="会計待ちの注文"
          orders={unpaid}
          emptyText="現在ありません"
          onSelect={goToToken}
        />
        <OrderList
          title="提供待ちの注文"
          orders={awaitingServe}
          emptyText="現在ありません"
          onSelect={goToToken}
        />
      </div>
    </div>
  );
}
