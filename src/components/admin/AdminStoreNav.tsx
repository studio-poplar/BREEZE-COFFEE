import Link from "next/link";

export function AdminStoreNav({ storeId, active }: { storeId: string; active: "menu" | "sales" }) {
  const tabs = [
    { key: "menu", label: "メニュー管理", href: `/admin/${storeId}/menu` },
    { key: "sales", label: "売上管理", href: `/admin/${storeId}/sales` },
  ] as const;

  return (
    <nav className="flex gap-1 border-b border-zinc-100 px-4">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`border-b-2 px-3 py-2.5 text-sm font-medium ${
            active === t.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
