import Link from "next/link";
import { getStaffSession } from "@/lib/auth/staff";
import { listStores } from "@/lib/data/stores";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";

export default async function AdminPage() {
  const session = await getStaffSession();
  if (!session) return <StaffLoginForm title="管理画面 ログイン" />;
  if (session.role !== "admin") {
    return (
      <div className="min-h-screen">
        <StaffHeader title="管理画面" name={session.displayName} />
        <p className="mt-16 text-center text-sm text-zinc-400">この画面を利用する権限がありません</p>
      </div>
    );
  }

  const stores = await listStores();

  return (
    <div className="min-h-screen">
      <StaffHeader title="管理画面" name={session.displayName} />
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">店舗一覧</h1>
          <Link href="/admin/stores" className="text-sm text-zinc-500 underline">
            店舗を管理
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {stores.map((s) => (
            <li key={s.store_id} className="rounded-lg border border-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-zinc-400">
                  {s.type === "permanent" ? "常設店" : "間借りカフェ"}
                  {!s.active && "・非公開"}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <Link href={`/admin/${s.store_id}/menu`} className="text-zinc-600 underline">
                  メニュー
                </Link>
                <Link href={`/admin/${s.store_id}/sales`} className="text-zinc-600 underline">
                  売上
                </Link>
              </div>
            </li>
          ))}
          {stores.length === 0 && <p className="text-sm text-zinc-400">店舗がまだありません</p>}
        </ul>
      </div>
    </div>
  );
}
