"use client";

import { useState } from "react";
import type { Staff, StaffRole, Store } from "@/lib/types";

export function StaffEditForm({
  staff,
  stores,
  isSelf,
  onCancel,
  onSaved,
}: {
  staff: Staff;
  stores: Store[];
  isSelf: boolean;
  onCancel: () => void;
  onSaved: (staff: Staff) => void;
}) {
  const [displayName, setDisplayName] = useState(staff.display_name);
  const [role, setRole] = useState<StaffRole>(staff.role);
  const [storeIds, setStoreIds] = useState<string[]>(staff.store_ids);
  const [active, setActive] = useState(staff.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  function toggleStore(storeId: string) {
    setStoreIds((prev) => (prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/staff/${staff.staff_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        role,
        store_ids: role === "admin" ? [] : storeIds,
        active,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error === "cannot_deactivate_self" ? "自分自身は無効化できません" : "保存に失敗しました");
      return;
    }
    onSaved(data.staff);
  }

  async function submitResetPassword() {
    setResetting(true);
    setResetError(null);
    const res = await fetch(`/api/admin/staff/${staff.staff_id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });
    setResetting(false);
    if (!res.ok) {
      setResetError("リセットに失敗しました(8文字以上にしてください)");
      return;
    }
    setResetDone(true);
    setNewPassword("");
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 className="mb-1 text-lg font-bold">スタッフを編集</h2>
        <p className="mb-4 text-xs text-zinc-400">@{staff.username}</p>

        <label className="mb-1 block text-xs text-zinc-500">表示名</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="mb-1 block text-xs text-zinc-500">ロール</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="register">レジ担当</option>
          <option value="admin">管理者</option>
        </select>

        {role === "register" && (
          <div className="mb-3">
            <label className="mb-1 block text-xs text-zinc-500">担当店舗</label>
            <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-2">
              {stores.map((s) => (
                <label key={s.store_id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={storeIds.includes(s.store_id)}
                    onChange={() => toggleStore(s.store_id)}
                  />
                  {s.name}
                </label>
              ))}
              {stores.length === 0 && <p className="text-xs text-zinc-400">店舗がありません</p>}
            </div>
          </div>
        )}

        <label className={`mb-4 flex items-center gap-2 text-sm ${isSelf ? "opacity-40" : ""}`}>
          <input
            type="checkbox"
            checked={active}
            disabled={isSelf}
            onChange={(e) => setActive(e.target.checked)}
          />
          有効なアカウント(オフにするとログインできなくなります)
        </label>
        {isSelf && <p className="mb-3 -mt-2 text-xs text-zinc-400">自分自身は無効化できません</p>}

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="mb-4 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-full border border-zinc-300 py-2.5 font-medium">
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={saving || !displayName}
            className="flex-1 rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          {!showResetPassword ? (
            <button
              onClick={() => setShowResetPassword(true)}
              className="w-full rounded-full border border-red-200 py-2.5 text-sm font-medium text-red-500"
            >
              パスワードをリセット
            </button>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">新しいパスワード</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setResetDone(false);
                }}
                placeholder="8文字以上"
                className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
              {resetError && <p className="mb-2 text-xs text-red-500">{resetError}</p>}
              {resetDone && <p className="mb-2 text-xs text-emerald-600">パスワードを変更しました</p>}
              <button
                onClick={submitResetPassword}
                disabled={resetting || newPassword.length < 8}
                className="w-full rounded-full bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {resetting ? "リセット中..." : "このパスワードに変更する"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
