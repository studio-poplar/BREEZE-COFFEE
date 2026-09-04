import { getStaffSession } from "@/lib/auth/staff";
import { listStores } from "@/lib/data/stores";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { MakerBoard } from "@/components/register/MakerBoard";

export default async function MakerPage() {
  const session = await getStaffSession();
  if (!session) return <StaffLoginForm title="メイク画面 ログイン" />;

  const allStores = (await listStores()).filter((s) => s.active);
  const stores =
    session.role === "admin" ? allStores : allStores.filter((s) => session.storeIds.includes(s.store_id));

  return (
    <div className="min-h-screen">
      <StaffHeader title="メイク画面" name={session.displayName} />
      {stores.length === 0 ? (
        <p className="mt-16 text-center text-sm text-zinc-400">担当店舗が設定されていません</p>
      ) : (
        <MakerBoard stores={stores} />
      )}
    </div>
  );
}
