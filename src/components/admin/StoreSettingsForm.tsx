"use client";

import { useState } from "react";
import type { Store } from "@/lib/types";

export function StoreSettingsForm({
  store,
  onCancel,
  onSaved,
}: {
  store: Store;
  onCancel: () => void;
  onSaved: (store: Store) => void;
}) {
  const [address, setAddress] = useState(store.address ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [invoiceRegNo, setInvoiceRegNo] = useState(store.invoice_reg_no ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/stores/${store.store_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: address || null,
        phone: phone || null,
        invoice_reg_no: invoiceRegNo || null,
      }),
    });
    setSaving(false);
    if (!res.ok) return setError("保存に失敗しました");
    const { store: updated } = await res.json();
    onSaved(updated);
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-bold">領収書・レシートの発行元情報</h2>
        <p className="mb-4 text-xs text-zinc-400">{store.name}</p>

        <label className="mb-1 block text-xs text-zinc-500">住所</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="例）東京都渋谷区〇〇1-2-3"
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="mb-1 block text-xs text-zinc-500">電話番号</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="例）03-1234-5678"
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="mb-1 block text-xs text-zinc-500">インボイス登録番号</label>
        <input
          value={invoiceRegNo}
          onChange={(e) => setInvoiceRegNo(e.target.value)}
          placeholder="例）T1234567890123"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
        <p className="mb-3 mt-1 text-xs text-zinc-400">
          未入力の項目はレシート・領収書に表示されません
        </p>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-full border border-zinc-300 py-2.5 font-medium">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
