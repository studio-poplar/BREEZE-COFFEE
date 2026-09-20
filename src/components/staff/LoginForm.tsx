"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

export function StaffLoginForm({ title }: { title: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        const minutes = data?.retry_after_minutes ?? 15;
        setError(`ログイン試行回数が多すぎます。${minutes}分後に再度お試しください`);
        return;
      }
      setError("ユーザー名またはパスワードが違います");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <form onSubmit={submit} className="rise-in w-full max-w-xs app-card p-7">
        <div className="mb-5 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="mb-6 text-center text-base font-bold text-zinc-600">{title}</h1>
        <label className="mb-1 block text-xs text-zinc-500">ユーザー名</label>
        <input
          className="mb-3 w-full rounded-xl border border-zinc-200 px-3.5 py-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="mb-1 block text-xs text-zinc-500">パスワード</label>
        <input
          type="password"
          className="mb-4 w-full rounded-xl border border-zinc-200 px-3.5 py-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 font-bold text-white disabled:opacity-40"
        >
          {busy ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
