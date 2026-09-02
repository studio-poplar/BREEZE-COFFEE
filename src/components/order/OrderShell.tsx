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

  const navItem = (href: string, label: string, icon: ReactNode, badge?: number) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 active:bg-zinc-50"
      >
        <span
          className={`relative grid h-9 w-9 place-items-center rounded-full ${
            active ? "bg-zinc-900 text-white" : "text-zinc-400"
          }`}
        >
          {icon}
          {!!badge && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {badge}
            </span>
          )}
        </span>
        <span className={`text-[11px] ${active ? "font-semibold text-zinc-900" : "text-zinc-400"}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold">{store.name}</p>
          {profile && <p className="text-xs text-zinc-400">{profile.displayName} さん</p>}
        </div>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md border-t border-zinc-100 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItem(base, "メニュー", <MenuIcon />)}
        {navItem(`${base}/favorites`, "いつもの", <HeartIcon />)}
        {navItem(`${base}/cart`, "カート", <CartIcon />, count)}
      </nav>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7-4.4-9.5-8.9C.8 8.4 2.3 5 5.7 5c2 0 3.5 1.2 4.5 2.7C11.2 6.2 12.7 5 14.7 5c3.4 0 4.9 3.4 3.2 6.6-2.5 4.5-9.5 8.9-9.5 8.9z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l-1 12.5H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
