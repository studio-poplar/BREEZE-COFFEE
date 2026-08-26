"use client";

import { useState } from "react";
import Image from "next/image";
import { MenuItemForm } from "@/components/admin/MenuItemForm";
import type { MenuItem } from "@/lib/types";

export function AdminMenu({ storeId, initialItems }: { storeId: string; initialItems: MenuItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/admin/menu?store_id=${storeId}`);
    if (res.ok) setItems((await res.json()).items);
  }

  async function remove(item: MenuItem) {
    if (!confirm(`「${item.name}」を削除しますか?`)) return;
    const res = await fetch(`/api/admin/menu/${item.item_id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "削除に失敗しました");
      return;
    }
    setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">メニュー管理</h1>
        <button
          onClick={() => setEditing("new")}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          + メニュー追加
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.item_id}
            className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100">
              {item.image_path && (
                <Image src={item.image_path} alt={item.name} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {item.name}
                {!item.active && (
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    非公開
                  </span>
                )}
              </p>
              <p className="text-sm text-zinc-500">
                ¥{item.price.toLocaleString()} / {item.category || "未分類"}
              </p>
            </div>
            <button onClick={() => setEditing(item)} className="text-xs text-zinc-500 underline">
              編集
            </button>
            <button onClick={() => remove(item)} className="text-xs text-red-400 underline">
              削除
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-zinc-400">メニューがまだありません</p>}
      </ul>

      {editing && (
        <MenuItemForm
          storeId={storeId}
          item={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
