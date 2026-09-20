import Link from "next/link";

export function AdminStoreNav({ storeId, active }: { storeId: string; active: "menu" | "sales" }) {
  const tabs = [
    { key: "menu", label: "メニュー管理", href: `/admin/${storeId}/menu` },
    { key: "sales", label: "売上管理", href: `/admin/${storeId}/sales` },
  ] as const;

  return (
    <nav className="mx-auto flex max-w-md gap-1 px-4 pt-4">
      <div className="flex w-full rounded-full bg-zinc-200/60 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex-1 rounded-full py-2 text-center text-sm font-bold ${
              active === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
