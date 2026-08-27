import { getStaffSession } from "@/lib/auth/staff";
import { listStores } from "@/lib/data/stores";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { RegisterScan } from "@/components/register/RegisterScan";

export default async function RegisterPage() {
  const session = await getStaffSession();
  if (!session) return <StaffLoginForm title="レジアプリ ログイン" />;

  const allStores = (await listStores()).filter((s) => s.active);
  const stores =
    session.role === "admin" ? allStores : allStores.filter((s) => session.storeIds.includes(s.store_id));

  return (
    <div className="min-h-screen">
      <StaffHeader title="レジアプリ" name={session.displayName} />
      {stores.length === 0 ? (
        <p className="mt-16 text-center text-sm text-zinc-400">担当店舗が設定されていません</p>
      ) : (
        <RegisterScan stores={stores} />
      )}
    </div>
  );
}
