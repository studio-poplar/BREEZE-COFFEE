"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-block text-xs text-zinc-500 hover:underline"
          >
            ← {backLabel ?? "戻る"}
          </Link>
        )}
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-zinc-400">{name} でログイン中</p>
      </div>
      <button onClick={logout} className="text-xs text-zinc-400 underline">
        ログアウト
      </button>
    </header>
  );
}
