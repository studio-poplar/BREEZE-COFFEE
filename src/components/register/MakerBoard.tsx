"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Order, Store } from "@/lib/types";

const POLL_INTERVAL_MS = 2000;

export function MakerBoard({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.store_id ?? "");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const storeIdRef = useRef(storeId);
  useEffect(() => {
    storeIdRef.current = storeId;
  }, [storeId]);

  function refresh() {
    const currentStoreId = storeIdRef.current;
    if (!currentStoreId) return;
    fetch(`/api/register/orders?store_id=${currentStoreId}&status=paid`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }

  useEffect(refresh, [storeId]);

  // Same pause-while-backgrounded pattern as the cashier board — this screen
  // is meant to stay open on its own device all shift, watching for new
  // paid orders without a manual reload.
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/register" className="mb-4 inline-block text-xs text-zinc-400 underline">
        ← レジ画面はこちら
      </Link>
      <h1 className="mb-4 text-lg font-bold">提供待ち</h1>

      {stores.length > 1 && (
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
      )}

      {orders === null && <p className="text-sm text-zinc-400">読み込み中...</p>}
      {orders !== null && orders.length === 0 && (
        <p className="text-sm text-zinc-400">提供待ちの注文はありません</p>
      )}

      <ul className="flex flex-col gap-3">
        {orders?.map((o) => (
          <li key={o.order_id}>
            <button
              onClick={() => router.push(`/register/maker/${o.order_token}`)}
              className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-lg font-bold tracking-widest">{o.order_token}</span>
                <span className="text-sm text-zinc-500">
                  {o.items.reduce((n, i) => n + i.qty, 0)}点
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {o.items.map((item) => (
                  <li key={item.order_item_id} className="text-base font-medium">
                    {item.item_name_snapshot}
                    <span className="ml-1.5 text-zinc-500">×{item.qty}</span>
                    {item.selected_options.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-zinc-400">
                        {item.selected_options.map((sel) => sel.choice_label).join(" / ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
