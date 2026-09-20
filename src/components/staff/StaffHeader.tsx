"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";

export function StaffHeader({
  title,
  name,
  backHref,
  backLabel,
}: {
  title: string;
  name: string;
  /** When set, shows a back link above the title (e.g. "/admin"). */
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header
      className="glass sticky top-0 z-30 border-b border-zinc-200/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <div className="leading-tight">
            {backHref && (
              <Link href={backHref} className="mb-0.5 inline-block text-[11px] font-medium text-brand-600">
                ← {backLabel ?? "戻る"}
              </Link>
            )}
            <p className="text-[15px] font-bold tracking-tight">{title}</p>
            <p className="text-[11px] text-zinc-400">{name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/staff/password"
            className="press rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
          >
            パスワード変更
          </Link>
          <button
            onClick={logout}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
