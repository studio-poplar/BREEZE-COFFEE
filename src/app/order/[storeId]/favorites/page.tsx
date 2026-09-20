"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { useCart } from "@/lib/client/cart";
import { apiFetch } from "@/lib/client/api";
import type { ResolvedFavorite } from "@/lib/types";

export default function FavoritesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { token, ready, getAuthToken } = useCustomerAuth();
  const { addLine } = useCart(storeId);
  const router = useRouter();
  const [favorites, setFavorites] = useState<ResolvedFavorite[] | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    getAuthToken().then((freshToken) => {
      if (!freshToken) return;
      apiFetch<{ favorites: ResolvedFavorite[] }>(`/api/favorites?store_id=${storeId}`, {
        token: freshToken,
      }).then((res) => setFavorites(res.favorites));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, storeId]);

  async function remove(favoriteId: string) {
    const freshToken = await getAuthToken();
    if (!freshToken) return;
    await apiFetch(`/api/favorites/${favoriteId}`, { method: "DELETE", token: freshToken });
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
      <div className="mx-auto mt-20 flex max-w-md flex-col items-center px-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.5s-7-4.4-9.5-8.9C.8 8.4 2.3 5 5.7 5c2 0 3.5 1.2 4.5 2.7C11.2 6.2 12.7 5 14.7 5c3.4 0 4.9 3.4 3.2 6.6-2.5 4.5-9.5 8.9-9.5 8.9z" />
          </svg>
        </span>
        <p className="mt-4 font-bold">「いつもの」はまだありません</p>
        <p className="mt-1 text-sm text-zinc-400">商品ページから、お気に入りの組み合わせを登録できます</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-5">
      <h1 className="mb-4 px-1 text-2xl font-bold tracking-tight">いつもの</h1>
      <ul className="flex flex-col gap-3">
        {favorites.map((fav) => (
          <li key={fav.favorite_id} className="app-card rise-in flex items-center gap-3 p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              {fav.current_item?.image_path && (
                <Image src={fav.current_item.image_path} alt={fav.label} fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{fav.label}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-zinc-500">
                ¥{fav.current_item?.price.toLocaleString()}〜
              </p>
              <button onClick={() => remove(fav.favorite_id)} className="mt-1 text-xs text-zinc-400 underline">
                削除
              </button>
            </div>
            <button
              onClick={() => addToCart(fav)}
              className="shrink-0 rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white"
            >
              追加
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
