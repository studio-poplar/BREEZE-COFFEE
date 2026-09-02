"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("新しいパスワード(確認)が一致しません");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/staff/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "変更に失敗しました");
      return;
    }

    setDone(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xs px-4 py-16 text-center">
        <p className="mb-6 text-sm font-medium text-green-600">パスワードを変更しました</p>
        <button
          onClick={() => router.back()}
          className="w-full rounded-full border border-zinc-300 py-2.5 font-medium"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xs px-4 py-8">
      <h1 className="mb-6 text-lg font-bold">パスワード変更</h1>

      <label className="mb-1 block text-xs text-zinc-500">現在のパスワード</label>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        autoComplete="current-password"
        className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
      />

      <label className="mb-1 block text-xs text-zinc-500">新しいパスワード(8文字以上)</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        autoComplete="new-password"
        className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2"
      />

      <label className="mb-1 block text-xs text-zinc-500">新しいパスワード(確認)</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2"
      />

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={busy || !currentPassword || !newPassword || !confirmPassword}
        className="w-full rounded-full bg-zinc-900 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {busy ? "変更中..." : "変更する"}
      </button>
    </form>
  );
}
