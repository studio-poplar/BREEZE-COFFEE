"use client";

import { useState } from "react";
import Link from "next/link";
import type { Store, StoreType } from "@/lib/types";

export function StoreManager({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState(initialStores);
  const [name, setName] = useState("");
  const [type, setType] = useState<StoreType>("permanent");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        starts_at: type === "popup" && startsAt ? startsAt : null,
        ends_at: type === "popup" && endsAt ? endsAt : null,
      }),
    });
    setSaving(false);
    if (!res.ok) return setError("店舗の作成に失敗しました");
    const { store } = await res.json();
    setStores((prev) => [store, ...prev]);
    setName("");
    setStartsAt("");
    setEndsAt("");
  }

  async function toggleActive(store: Store) {
    const res = await fetch(`/api/admin/stores/${store.store_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !store.active }),
    });
    if (!res.ok) return;
    const { store: updated } = await res.json();
    setStores((prev) => prev.map((s) => (s.store_id === updated.store_id ? updated : s)));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold">店舗 / 開催回の管理</h1>

      <form onSubmit={createStore} className="mb-8 rounded-lg border border-zinc-200 p-4">
        <label className="mb-1 block text-xs text-zinc-500">店舗名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="例）Breeze Coffee 渋谷ポップアップ"
        />
        <label className="mb-1 block text-xs text-zinc-500">タイプ</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as StoreType)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="permanent">常設店</option>
          <option value="popup">間借りカフェ (開催回)</option>
        </select>
        {type === "popup" && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">開始日時</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">終了日時</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </div>
          </div>
        )}
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name}
          className="w-full rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
        >
          {saving ? "作成中..." : "店舗を作成"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {stores.map((s) => (
          <li key={s.store_id} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-zinc-400">
                  {s.type === "permanent" ? "常設店" : "間借りカフェ"}
                  {s.starts_at && ` / ${new Date(s.starts_at).toLocaleString("ja-JP")}〜`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/${s.store_id}/menu`} className="text-xs text-zinc-500 underline">
                  メニュー
                </Link>
                <button
                  onClick={() => toggleActive(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.active ? "bg-green-50 text-green-600" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {s.active ? "公開中" : "非公開"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
