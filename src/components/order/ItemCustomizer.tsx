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
  const { token, getAuthToken } = useCustomerAuth();
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

  async function saveFavorite() {
    setSavingFavorite(true);
    try {
      const freshToken = await getAuthToken();
      if (!freshToken) return;
      const label =
        selectedOptions.length > 0
          ? `${item.name} (${selectedOptions.map((o) => o.choice_label).join("/")})`
          : item.name;
      await apiFetch("/api/favorites", {
        method: "POST",
        token: freshToken,
        body: JSON.stringify({ item_id: item.item_id, label, selected_options: selectedOptions }),
      });
      setFavoriteSaved(true);
    } finally {
      setSavingFavorite(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="relative aspect-[4/3] w-full bg-zinc-100">
        {item.image_path && (
          <Image src={item.image_path} alt={item.name} fill priority sizes="448px" className="object-cover" />
        )}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="戻る"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      </div>

      <div className="relative -mt-6 rounded-t-[1.75rem] bg-[var(--background)] px-4 pt-6">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand-600">{item.category || "MENU"}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{item.name}</h1>
          </div>
          <p className="pt-1 text-2xl font-bold tabular-nums">¥{unitPrice.toLocaleString()}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {item.option_groups.map((group) => (
            <fieldset key={group.group_id} className="app-card p-4">
              <legend className="sr-only">{group.label}</legend>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">{group.label}</p>
                {group.required ? (
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">必須</span>
                ) : (
                  <span className="text-[11px] font-medium text-zinc-400">任意</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.choices.map((choice) => {
                  const active = (selection[group.group_id] ?? []).includes(choice.choice_id);
                  return (
                    <button
                      key={choice.choice_id}
                      type="button"
                      onClick={() => toggleChoice(group.group_id, choice.choice_id, !!group.multi_select)}
                      className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {choice.label}
                      {choice.extra_price > 0 && (
                        <span className={`ml-1 text-xs ${active ? "text-white/70" : "text-zinc-400"}`}>
                          +¥{choice.extra_price}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="app-card mt-3 flex items-center justify-between p-4">
          <p className="text-sm font-bold">数量</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-xl"
              aria-label="減らす"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-xl"
              aria-label="増やす"
            >
              ＋
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={missingRequired || savingFavorite || favoriteSaved || !token}
          onClick={saveFavorite}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-600 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={favoriteSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.5s-7-4.4-9.5-8.9C.8 8.4 2.3 5 5.7 5c2 0 3.5 1.2 4.5 2.7C11.2 6.2 12.7 5 14.7 5c3.4 0 4.9 3.4 3.2 6.6-2.5 4.5-9.5 8.9-9.5 8.9z" />
          </svg>
          {favoriteSaved ? "「いつもの」に登録しました" : "この内容を「いつもの」に登録"}
        </button>
        <div className="h-24" />
      </div>

      <div
        className="fixed left-0 right-0 z-30 px-4"
        style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      >
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
          className="mx-auto flex w-full max-w-[calc(28rem-2rem)] items-center justify-between rounded-full bg-zinc-900 px-6 py-3.5 font-bold text-white shadow-float disabled:opacity-50"
        >
          <span>{missingRequired ? "必須項目を選択してください" : "カートに追加"}</span>
          {!missingRequired && <span className="tabular-nums">¥{(unitPrice * qty).toLocaleString()}</span>}
        </button>
      </div>
    </div>
  );
}
