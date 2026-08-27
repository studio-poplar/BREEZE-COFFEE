import Link from "next/link";
import { listActiveStores } from "@/lib/data/stores";

// Reads the store list from the DB at request time — without this it would
// be prerendered once at build time and never pick up stores added later.
export const dynamic = "force-dynamic";

export default async function Home() {
  const stores = await listActiveStores();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">GROOVE COFFEE</h1>
        <p className="mt-1 text-sm text-zinc-500">スマート注文アプリ (開発用トップページ)</p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-500">お客さん用アプリ</h2>
        <p className="mb-3 text-xs text-zinc-400">
          本番では店頭のQR/LIFFリンクから店舗ごとに直接開きます。ここでは開発用に店舗を選べます。
        </p>
        <ul className="flex flex-col gap-2">
          {stores.map((s) => (
            <li key={s.store_id}>
              <Link
                href={`/order/${s.store_id}`}
                className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-xs text-zinc-400">
                  {s.type === "permanent" ? "常設店" : "間借りカフェ"}
                </span>
              </Link>
            </li>
          ))}
          {stores.length === 0 && (
            <li className="text-sm text-zinc-400">
              店舗が未登録です。管理画面から作成してください。
            </li>
          )}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-zinc-700"
        >
          レジアプリ
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-zinc-900 px-4 py-3 text-center text-sm font-medium hover:bg-zinc-50"
        >
          管理画面
        </Link>
      </section>
    </div>
  );
}
