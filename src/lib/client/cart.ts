"use client";

import { useCallback, useEffect, useState } from "react";
import type { SelectedOption } from "@/lib/types";

export interface CartLine {
  key: string; // item_id + sorted choice_ids, used to merge identical lines
  item_id: string;
  item_name: string;
  image_path: string | null;
  unit_price: number;
  qty: number;
  choice_ids: string[];
  selected_labels: SelectedOption[];
}

function cartKey(storeId: string) {
  return `groove_cart_${storeId}`;
}

function makeLineKey(itemId: string, choiceIds: string[]) {
  return `${itemId}::${[...choiceIds].sort().join(",")}`;
}

function readCart(storeId: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartKey(storeId));
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(storeId: string, lines: CartLine[]) {
  localStorage.setItem(cartKey(storeId), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("groove-cart-updated", { detail: { storeId } }));
}

export function useCart(storeId: string) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    // Cart lives in localStorage, unreadable during SSR/first paint, so the
    // real contents only land after mount — intentionally not state derived
    // from props/state, which is what this rule otherwise guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readCart(storeId));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.storeId === storeId) setLines(readCart(storeId));
    };
    window.addEventListener("groove-cart-updated", handler);
    return () => window.removeEventListener("groove-cart-updated", handler);
  }, [storeId]);

  const addLine = useCallback(
    (input: Omit<CartLine, "key" | "qty"> & { qty?: number }) => {
      const key = makeLineKey(input.item_id, input.choice_ids);
      const current = readCart(storeId);
      const existing = current.find((l) => l.key === key);
      const addedQty = input.qty ?? 1;
      const next = existing
        ? current.map((l) => (l.key === key ? { ...l, qty: l.qty + addedQty } : l))
        : [...current, { ...input, key, qty: addedQty }];
      writeCart(storeId, next);
    },
    [storeId]
  );

  const updateQty = useCallback(
    (key: string, qty: number) => {
      const current = readCart(storeId);
      const next =
        qty <= 0
          ? current.filter((l) => l.key !== key)
          : current.map((l) => (l.key === key ? { ...l, qty } : l));
      writeCart(storeId, next);
    },
    [storeId]
  );

  const removeLine = useCallback(
    (key: string) => {
      writeCart(
        storeId,
        readCart(storeId).filter((l) => l.key !== key)
      );
    },
    [storeId]
  );

  const clear = useCallback(() => writeCart(storeId, []), [storeId]);

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return { lines, addLine, updateQty, removeLine, clear, total, count };
}
