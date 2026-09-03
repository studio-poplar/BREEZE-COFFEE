"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuItem, MenuItemInput } from "@/lib/types";

type FormOptionGroup = {
  key: string;
  label: string;
  required: boolean;
  multi_select: boolean;
  choices: { key: string; label: string; extra_price: number }[];
};

function toFormGroups(item?: MenuItem): FormOptionGroup[] {
  if (!item) return [];
  return item.option_groups.map((g) => ({
    key: g.group_id,
    label: g.label,
    required: !!g.required,
    multi_select: !!g.multi_select,
    choices: g.choices.map((c) => ({ key: c.choice_id, label: c.label, extra_price: c.extra_price })),
  }));
}

let tempKeySeq = 0;
function tempKey() {
  tempKeySeq += 1;
  return `tmp-${tempKeySeq}`;
}

const MAX_DIMENSION = 1600;

// Phone camera photos routinely arrive well over our 4MB upload cap, and
// iPhones default to HEIC (which most non-Safari browsers can't even
// decode). Downscaling through a canvas fixes the size problem for any
// format the browser CAN decode, and incidentally re-encodes everything to
// JPEG/PNG along the way. If the browser can't decode the source at all
// (e.g. a raw HEIC file in Chrome), this falls back to the original file
// and lets the server reject it with a specific, actionable message.
async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Keep PNG's transparency; flatten everything else to JPEG for the best
  // size/quality tradeoff on a photo.
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.85));
  if (!blob) return file;

  const ext = outputType === "image/png" ? "png" : "jpg";
  return new File([blob], `${file.name.replace(/\.\w+$/, "")}.${ext}`, { type: outputType });
}

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  unsupported_type:
    "対応していない画像形式です。写真アプリでJPEGまたはPNGとして保存し直してからお試しください。",
  file_too_large: "ファイルサイズが大きすぎます(4MBまで)。",
};

export function MenuItemForm({
  storeId,
  item,
  onCancel,
  onSaved,
}: {
  storeId: string;
  item?: MenuItem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item?.price ?? 0);
  const [costPrice, setCostPrice] = useState(item?.cost_price ?? 0);
  const [category, setCategory] = useState(item?.category ?? "");
  const [imagePath, setImagePath] = useState<string | null>(item?.image_path ?? null);
  const [active, setActive] = useState(item ? !!item.active : true);
  const [groups, setGroups] = useState<FormOptionGroup[]>(toFormGroups(item));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const resized = await resizeImage(file);
      const form = new FormData();
      form.append("file", resized);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(UPLOAD_ERROR_MESSAGE[data?.error] ?? "画像のアップロードに失敗しました");
      }
      setImagePath(data.path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { key: tempKey(), label: "", required: false, multi_select: false, choices: [] },
    ]);
  }

  function updateGroup(key: string, patch: Partial<FormOptionGroup>) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  function removeGroup(key: string) {
    setGroups((prev) => prev.filter((g) => g.key !== key));
  }

  function addChoice(groupKey: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? { ...g, choices: [...g.choices, { key: tempKey(), label: "", extra_price: 0 }] }
          : g
      )
    );
  }

  function updateChoice(groupKey: string, choiceKey: string, patch: Partial<{ label: string; extra_price: number }>) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? { ...g, choices: g.choices.map((c) => (c.key === choiceKey ? { ...c, ...patch } : c)) }
          : g
      )
    );
  }

  function removeChoice(groupKey: string, choiceKey: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey ? { ...g, choices: g.choices.filter((c) => c.key !== choiceKey) } : g
      )
    );
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const payload: MenuItemInput & { store_id: string } = {
      store_id: storeId,
      name,
      price,
      cost_price: costPrice,
      category,
      image_path: imagePath,
      active,
      option_groups: groups.map((g) => ({
        label: g.label,
        required: g.required,
        multi_select: g.multi_select,
        choices: g.choices.map((c) => ({ label: c.label, extra_price: c.extra_price })),
      })),
    };

    const res = await fetch(item ? `/api/admin/menu/${item.item_id}` : "/api/admin/menu", {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setError("保存に失敗しました");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-bold">{item ? "メニューを編集" : "メニューを追加"}</h2>

        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
            {imagePath && <Image src={imagePath} alt="" fill className="object-cover" />}
          </div>
          <label className="text-sm text-zinc-500">
            <span className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5">
              {uploading ? "アップロード中..." : "画像を選択"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>
        {uploadError && <p className="mb-4 -mt-2 text-xs text-red-500">{uploadError}</p>}

        <label className="mb-1 block text-xs text-zinc-500">商品名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <div className="mb-1 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">価格</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">原価</label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
        </div>
        <p className="mb-3 text-xs text-zinc-400">
          {price > 0
            ? `粗利率 ${(((price - costPrice) / price) * 100).toFixed(0)}% (粗利 ¥${(price - costPrice).toLocaleString()})`
            : "材料費(豆・ミルク・容器など)の合計を入力すると粗利率が売上管理に反映されます"}
        </p>

        <label className="mb-1 block text-xs text-zinc-500">カテゴリ</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          販売中として公開する
        </label>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">オプション</h3>
            <button onClick={addGroup} className="text-xs text-zinc-500 underline">
              + グループを追加
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <div key={g.key} className="rounded-lg border border-zinc-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={g.label}
                    onChange={(e) => updateGroup(g.key, { label: e.target.value })}
                    placeholder="グループ名 (例: サイズ)"
                    className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                  />
                  <button onClick={() => removeGroup(g.key)} className="text-xs text-red-400">
                    削除
                  </button>
                </div>
                <div className="mb-2 flex gap-4 text-xs text-zinc-500">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={g.required}
                      onChange={(e) => updateGroup(g.key, { required: e.target.checked })}
                    />
                    必須
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={g.multi_select}
                      onChange={(e) => updateGroup(g.key, { multi_select: e.target.checked })}
                    />
                    複数選択可
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  {g.choices.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <input
                        value={c.label}
                        onChange={(e) => updateChoice(g.key, c.key, { label: e.target.value })}
                        placeholder="選択肢名"
                        className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={c.extra_price}
                        onChange={(e) =>
                          updateChoice(g.key, c.key, { extra_price: Number(e.target.value) })
                        }
                        placeholder="追加料金"
                        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <button onClick={() => removeChoice(g.key, c.key)} className="text-xs text-red-400">
                        削除
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addChoice(g.key)} className="mt-1 text-left text-xs text-zinc-400 underline">
                    + 選択肢を追加
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-full border border-zinc-300 py-2.5 font-medium">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={saving || !name || price < 0}
            className="flex-1 rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
