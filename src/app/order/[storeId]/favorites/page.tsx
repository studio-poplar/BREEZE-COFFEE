"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { useCart } from "@/lib/client/cart";
import { apiFetch } from "@/lib/client/api";
import type { ResolvedFavorite } from "@/lib/types";

export default function FavoritesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { token, ready } = useCustomerAuth();
  const { addLine } = useCart(storeId);
  const router = useRouter();
  const [favorites, setFavorites] = useState<ResolvedFavorite[] | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiFetch<{ favorites: ResolvedFavorite[] }>(`/api/favorites?store_id=${storeId}`, { token }).then(
      (res) => setFavorites(res.favorites)
    );
  }, [ready, token, storeId]);

  async function remove(favoriteId: string) {
    if (!token) return;
    await apiFetch(`/api/favorites/${favoriteId}`, { method: "DELETE", token });
    setFavorites((prev) => prev?.filter((f) => f.favorite_id !== favoriteId) ?? null);
  }

  function addToCart(fav: ResolvedFavorite) {
    if (!fav.current_item) return;
    const choiceIds: string[] = [];
    let unitPrice = fav.current_item.price;
    for (const saved of fav.selected_options) {
      const group = fav.current_item.option_groups.find((g) => g.label === saved.group_label);
      const choice = group?.choices.find((c) => c.label === saved.choice_label);
      if (choice) {
        choiceIds.push(choice.choice_id);
        unitPrice += choice.extra_price;
      }
    }
    addLine({
      item_id: fav.current_item.item_id,
      item_name: fav.current_item.name,
      image_path: fav.current_item.image_path,
      unit_price: unitPrice,
      choice_ids: choiceIds,
      selected_labels: fav.selected_options,
    });
    router.push(`/order/${storeId}/cart`);
  }

  if (favorites === null) {
    return <p className="mt-16 text-center text-sm text-zinc-400">読み込み中...</p>;
  }

  if (favorites.length === 0) {
    return (
      <p className="mt-16 px-6 text-center text-sm text-zinc-400">
        「いつもの」はまだありません。商品ページから登録できます。
      </p>
    );
  }

  return (
    <ul className="mx-auto flex max-w-md flex-col gap-2 px-4 py-4">
      {favorites.map((fav) => (
        <li key={fav.favorite_id} className="rounded-lg border border-zinc-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{fav.label}</p>
              <p className="text-sm text-zinc-500">¥{fav.current_item?.price.toLocaleString()}〜</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                onClick={() => addToCart(fav)}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                カートに追加
              </button>
              <button onClick={() => remove(fav.favorite_id)} className="text-xs text-zinc-400">
                削除
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
