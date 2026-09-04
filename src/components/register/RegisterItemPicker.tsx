"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuItem, Order } from "@/lib/types";

export function RegisterItemPicker({
  storeId,
  orderToken,
  onCancel,
  onAdded,
}: {
  storeId: string;
  orderToken: string;
  onCancel: () => void;
  onAdded: (order: Order) => void;
}) {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/menu?store_id=${storeId}`)
      .then((r) => r.json())
      .then((d) => setItems((d.items ?? []).filter((i: MenuItem) => i.active)));
  }, [storeId]);

  function toggleChoice(groupId: string, choiceId: string, multi: boolean) {
    setSelection((prev) => {
      const current = prev[groupId] ?? [];
      if (multi) {
        const next = current.includes(choiceId)
          ? current.filter((id) => id !== choiceId)
          : [...current, choiceId];
        return { ...prev, [groupId]: next };
      }
      return { ...prev, [groupId]: current.includes(choiceId) ? [] : [choiceId] };
    });
  }

  const { unitPrice, choiceIds, missingRequired } = useMemo(() => {
    if (!selectedItem) return { unitPrice: 0, choiceIds: [] as string[], missingRequired: false };
    let price = selectedItem.price;
    const ids: string[] = [];
    let missing = false;
    for (const group of selectedItem.option_groups) {
      const chosenIds = selection[group.group_id] ?? [];
      if (group.required && chosenIds.length === 0) missing = true;
      for (const choice of group.choices) {
        if (chosenIds.includes(choice.choice_id)) {
          price += choice.extra_price;
          ids.push(choice.choice_id);
        }
      }
    }
    return { unitPrice: price, choiceIds: ids, missingRequired: missing };
  }, [selectedItem, selection]);

  function selectItem(item: MenuItem) {
    setSelectedItem(item);
    setSelection({});
    setQty(1);
    setError(null);
  }

  async function submit() {
    if (!selectedItem) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_item", item_id: selectedItem.item_id, qty, choice_ids: choiceIds }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "追加に失敗しました");
      return;
    }
    onAdded(data.order);
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        {!selectedItem ? (
          <>
            <h2 className="mb-4 text-lg font-bold">商品を追加</h2>
            {items === null && <p className="text-sm text-zinc-400">読み込み中...</p>}
            {items && items.length === 0 && <p className="text-sm text-zinc-400">追加できる商品がありません</p>}
            <ul className="flex flex-col gap-2">
              {items?.map((item) => (
                <li key={item.item_id}>
                  <button
                    onClick={() => selectItem(item)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-zinc-500">¥{item.price.toLocaleString()}〜</span>
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={onCancel} className="mt-4 w-full rounded-full border border-zinc-300 py-2.5 font-medium">
              キャンセル
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setSelectedItem(null)} className="mb-3 text-sm text-zinc-400">
              ← 商品一覧に戻る
            </button>
            <h2 className="text-lg font-bold">{selectedItem.name}</h2>
            <p className="mb-4 text-sm text-zinc-500">¥{unitPrice.toLocaleString()}</p>

            <div className="flex flex-col gap-4">
              {selectedItem.option_groups.map((group) => (
                <fieldset key={group.group_id}>
                  <legend className="mb-2 text-sm font-semibold">
                    {group.label}
                    {group.required ? (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">必須</span>
                    ) : (
                      <span className="ml-2 text-[10px] text-zinc-400">任意</span>
                    )}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {group.choices.map((choice) => {
                      const active = (selection[group.group_id] ?? []).includes(choice.choice_id);
                      return (
                        <button
                          key={choice.choice_id}
                          type="button"
                          onClick={() => toggleChoice(group.group_id, choice.choice_id, !!group.multi_select)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"
                          }`}
                        >
                          {choice.label}
                          {choice.extra_price > 0 && ` (+¥${choice.extra_price})`}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-9 w-9 rounded-full border border-zinc-300 text-lg"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="h-9 w-9 rounded-full border border-zinc-300 text-lg"
              >
                ＋
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={onCancel} className="flex-1 rounded-full border border-zinc-300 py-2.5 font-medium">
                キャンセル
              </button>
              <button
                onClick={submit}
                disabled={saving || missingRequired}
                className="flex-1 rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
              >
                {missingRequired ? "必須項目を選択" : saving ? "追加中..." : `¥${(unitPrice * qty).toLocaleString()} を追加`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
