"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/lib/client/cart";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { apiFetch } from "@/lib/client/api";
import type { MenuItem, SelectedOption } from "@/lib/types";

export function ItemCustomizer({ storeId, item }: { storeId: string; item: MenuItem }) {
  const router = useRouter();
  const { addLine } = useCart(storeId);
  const { token } = useCustomerAuth();
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

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

  const { unitPrice, selectedOptions, choiceIds, missingRequired } = useMemo(() => {
    let price = item.price;
    const options: SelectedOption[] = [];
    const ids: string[] = [];
    let missing = false;

    for (const group of item.option_groups) {
      const chosenIds = selection[group.group_id] ?? [];
      if (group.required && chosenIds.length === 0) missing = true;
      for (const choice of group.choices) {
        if (chosenIds.includes(choice.choice_id)) {
          price += choice.extra_price;
          ids.push(choice.choice_id);
          options.push({
            group_label: group.label,
            choice_label: choice.label,
            extra_price: choice.extra_price,
          });
        }
      }
    }
    return { unitPrice: price, selectedOptions: options, choiceIds: ids, missingRequired: missing };
  }, [item, selection]);

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl bg-zinc-100">
        {item.image_path && (
          <Image src={item.image_path} alt={item.name} fill className="object-cover" />
        )}
      </div>
      <h1 className="text-xl font-bold">{item.name}</h1>
      <p className="mt-1 text-lg text-zinc-700">¥{unitPrice.toLocaleString()}</p>

      <div className="mt-6 flex flex-col gap-6">
        {item.option_groups.map((group) => (
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
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 text-zinc-700"
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

      <div className="mt-8 flex items-center justify-center gap-4">
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

      <button
        type="button"
        disabled={missingRequired}
        onClick={() => {
          addLine({
            item_id: item.item_id,
            item_name: item.name,
            image_path: item.image_path,
            unit_price: unitPrice,
            choice_ids: choiceIds,
            selected_labels: selectedOptions,
            qty,
          });
          router.push(`/order/${storeId}`);
        }}
        className="mt-6 w-full rounded-full bg-zinc-900 py-3 font-medium text-white disabled:opacity-40"
      >
        {missingRequired ? "必須項目を選択してください" : `¥${(unitPrice * qty).toLocaleString()} をカートに追加`}
      </button>

      <button
        type="button"
        disabled={missingRequired || savingFavorite || favoriteSaved || !token}
        onClick={async () => {
          if (!token) return;
          setSavingFavorite(true);
          try {
            const label =
              selectedOptions.length > 0
                ? `${item.name} (${selectedOptions.map((o) => o.choice_label).join("/")})`
                : item.name;
            await apiFetch("/api/favorites", {
              method: "POST",
              token,
              body: JSON.stringify({ item_id: item.item_id, label, selected_options: selectedOptions }),
            });
            setFavoriteSaved(true);
          } finally {
            setSavingFavorite(false);
          }
        }}
        className="mt-3 w-full rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 disabled:opacity-40"
      >
        {favoriteSaved ? "「いつもの」に登録しました" : "この内容を「いつもの」に登録"}
      </button>
    </div>
  );
}
