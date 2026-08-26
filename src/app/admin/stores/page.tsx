import { getStaffSession } from "@/lib/auth/staff";
import { listStores } from "@/lib/data/stores";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StoreManager } from "@/components/admin/StoreManager";

export default async function AdminStoresPage() {
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

  return (
    <div className="min-h-screen">
      <StaffHeader title="管理画面" name={session.displayName} />
      <StoreManager initialStores={listStores()} />
    </div>
  );
}
