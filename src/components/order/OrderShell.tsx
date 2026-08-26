"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { useCart } from "@/lib/client/cart";
import type { Store } from "@/lib/types";

function DevLoginForm({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <form
        className="w-full max-w-xs rounded-xl border border-zinc-200 p-6 text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          setError(null);
          try {
            await onSubmit(name.trim());
          } catch {
            setError("ログインに失敗しました");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="mb-1 text-xs font-medium text-amber-600">開発用ログイン (LIFF未接続)</p>
        <h2 className="mb-4 text-lg font-bold">お名前を入力してください</h2>
        <input
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-center"
          placeholder="例）山田太郎"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {busy ? "処理中..." : "はじめる"}
        </button>
      </form>
    </div>
  );
}

export function OrderShell({ store, children }: { store: Store; children: ReactNode }) {
  const { ready, isDevMode, token, profile, setDevName } = useCustomerAuth();
  const pathname = usePathname();
  const { count } = useCart(store.store_id);
  const base = `/order/${store.store_id}`;

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">読み込み中...</div>;
  }

  if (isDevMode && !token) {
    return <DevLoginForm onSubmit={setDevName} />;
  }

  const navItem = (href: string, label: string, badge?: number) => (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
        pathname === href ? "font-semibold text-zinc-900" : "text-zinc-400"
      }`}
    >
      <span className="relative">
        {label}
        {!!badge && (
          <span className="absolute -right-3 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] text-white">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold">{store.name}</p>
          {profile && <p className="text-xs text-zinc-400">{profile.displayName} さん</p>}
        </div>
      </header>
      <main className="flex-1 pb-16">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md border-t border-zinc-100 bg-white">
        {navItem(base, "メニュー")}
        {navItem(`${base}/favorites`, "いつもの")}
        {navItem(`${base}/cart`, "カート", count)}
      </nav>
    </div>
  );
}
