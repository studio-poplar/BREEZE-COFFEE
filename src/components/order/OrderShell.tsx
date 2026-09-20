"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCustomerAuth } from "@/lib/client/customer-auth";
import { useCart } from "@/lib/client/cart";
import { Logo, LogoMark } from "@/components/brand/Logo";
import type { Store } from "@/lib/types";

function DevLoginForm({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <form
        className="app-card rise-in w-full max-w-xs p-7 text-center"
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
        <div className="mb-5 flex justify-center">
          <Logo size={40} />
        </div>
        <h2 className="mb-4 text-base font-bold">お名前を入力してください</h2>
        <input
          className="mb-3 w-full rounded-xl border border-zinc-200 px-3 py-3 text-center"
          placeholder="例）山田太郎"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full rounded-full bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-40"
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
  const { count, total } = useCart(store.store_id);
  const base = `/order/${store.store_id}`;

  if (!ready) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-zinc-400">
        <LogoMark size={44} />
        読み込み中...
      </div>
    );
  }

  if (isDevMode && !token) {
    return <DevLoginForm onSubmit={setDevName} />;
  }

  const navItem = (href: string, label: string, active: boolean, icon: ReactNode, badge?: number) => (
    <Link href={href} className="press flex flex-1 flex-col items-center justify-center gap-0.5 pb-1.5 pt-2">
      <span
        className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
          active ? "bg-brand-100 text-brand-700" : "text-zinc-400"
        }`}
      >
        {icon}
        {!!badge && (
          <span className="absolute right-1.5 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[10.5px] ${active ? "font-bold text-zinc-900" : "font-medium text-zinc-400"}`}>
        {label}
      </span>
    </Link>
  );

  // The floating cart summary is for browsing; it would only be noise on the
  // cart, ticket and receipt screens themselves.
  const showCartBar =
    count > 0 && (pathname === base || pathname === `${base}/favorites`);

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="glass sticky top-0 z-30 border-b border-zinc-200/60"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight">{store.name}</p>
              {profile && <p className="text-[11px] text-zinc-400">{profile.displayName} さん</p>}
            </div>
          </div>
          {profile && (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {profile.displayName.trim().charAt(0)}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1" style={{ paddingBottom: showCartBar ? "9.5rem" : "6.5rem" }}>
        {children}
      </main>

      {showCartBar && (
        <Link
          href={`${base}/cart`}
          className="press rise-in fixed left-4 right-4 z-30 mx-auto flex max-w-[calc(28rem-2rem)] items-center justify-between rounded-full bg-zinc-900 py-3 pl-5 pr-5 text-white shadow-float"
          style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
        >
          <span className="flex items-center gap-2.5 text-sm font-bold">
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-zinc-900">
              {count}
            </span>
            カートを見る
          </span>
          <span className="text-base font-bold tabular-nums">¥{total.toLocaleString()}</span>
        </Link>
      )}

      <nav
        className="glass safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/60"
      >
        <div className="mx-auto flex max-w-md">
          {navItem(base, "メニュー", pathname === base || pathname.startsWith(`${base}/item`), <MenuIcon />)}
          {navItem(`${base}/favorites`, "いつもの", pathname === `${base}/favorites`, <HeartIcon />)}
          {navItem(`${base}/cart`, "カート", pathname === `${base}/cart`, <CartIcon />, count)}
        </div>
      </nav>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5s-7-4.4-9.5-8.9C.8 8.4 2.3 5 5.7 5c2 0 3.5 1.2 4.5 2.7C11.2 6.2 12.7 5 14.7 5c3.4 0 4.9 3.4 3.2 6.6-2.5 4.5-9.5 8.9-9.5 8.9z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l-1 12.5H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
