"use client";

import { useState } from "react";
import { StaffEditForm } from "@/components/admin/StaffEditForm";
import type { Staff, StaffRole, Store } from "@/lib/types";

const ROLE_LABEL: Record<StaffRole, string> = { admin: "管理者", register: "レジ担当" };

export function StaffManager({
  initialStaff,
  stores,
  currentStaffId,
}: {
  initialStaff: Staff[];
  stores: Store[];
  currentStaffId: string;
}) {
  const [staffList, setStaffList] = useState(initialStaff);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("register");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);

  function storeNames(ids: string[]) {
    return ids.map((id) => stores.find((s) => s.store_id === id)?.name ?? id).join("、");
  }

  function toggleStore(storeId: string) {
    setStoreIds((prev) => (prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]));
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
        role,
        store_ids: role === "admin" ? [] : storeIds,
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(
        data?.error === "username_taken"
          ? "そのユーザー名は既に使われています"
          : data?.error?.fieldErrors?.password?.[0] ?? data?.error?.fieldErrors?.username?.[0] ?? "作成に失敗しました"
      );
      return;
    }
    setStaffList((prev) => [data.staff, ...prev]);
    setUsername("");
    setPassword("");
    setDisplayName("");
    setRole("register");
    setStoreIds([]);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold">スタッフ管理</h1>

      <form onSubmit={createStaff} className="mb-8 rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-3 text-sm font-semibold">新しいスタッフを追加</h2>

        <label className="mb-1 block text-xs text-zinc-500">ユーザー名(半角英数字)</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="mb-1 block text-xs text-zinc-500">初期パスワード(8文字以上)</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

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

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !username || password.length < 8 || !displayName}
          className="w-full rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
        >
          {saving ? "作成中..." : "スタッフを作成"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {staffList.map((s) => (
          <li key={s.staff_id} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {s.display_name}
                  {!s.active && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                      無効
                    </span>
                  )}
                  {s.staff_id === currentStaffId && (
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500">
                      自分
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-400">
                  @{s.username} ・ {ROLE_LABEL[s.role]}
                  {s.role === "register" && s.store_ids.length > 0 && ` ・ ${storeNames(s.store_ids)}`}
                </p>
              </div>
              <button onClick={() => setEditing(s)} className="text-xs text-zinc-500 underline">
                編集
              </button>
            </div>
          </li>
        ))}
        {staffList.length === 0 && <p className="text-sm text-zinc-400">スタッフがまだいません</p>}
      </ul>

      {editing && (
        <StaffEditForm
          staff={editing}
          stores={stores}
          isSelf={editing.staff_id === currentStaffId}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            setStaffList((prev) => prev.map((s) => (s.staff_id === updated.staff_id ? updated : s)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
