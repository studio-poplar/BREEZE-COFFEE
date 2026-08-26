"use client";

import { useRouter } from "next/navigation";

export function StaffHeader({ title, name }: { title: string; name: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-zinc-400">{name} でログイン中</p>
      </div>
      <button onClick={logout} className="text-xs text-zinc-400 underline">
        ログアウト
      </button>
    </header>
  );
}
