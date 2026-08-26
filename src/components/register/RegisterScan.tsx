"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/register/QrScanner";
import type { Order, Store } from "@/lib/types";

export function RegisterScan({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.store_id ?? "");
  const [manualToken, setManualToken] = useState("");
  const [pending, setPending] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/register/orders?store_id=${storeId}&status=unpaid`)
      .then((r) => r.json())
      .then((d) => setPending(d.orders ?? []));
  }, [storeId]);

  function goToToken(token: string) {
    router.push(`/register/order/${token.trim().toUpperCase()}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">会計待ちの注文</h2>
        {pending === null && <p className="text-sm text-zinc-400">読み込み中...</p>}
        {pending?.length === 0 && <p className="text-sm text-zinc-400">現在ありません</p>}
        <ul className="flex flex-col gap-2">
          {pending?.map((o) => (
            <li key={o.order_id}>
              <button
                onClick={() => goToToken(o.order_token)}
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
    </div>
  );
}
