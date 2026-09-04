import { getStaffSession } from "@/lib/auth/staff";
import { listStores } from "@/lib/data/stores";
import { listStaff } from "@/lib/data/staff";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffManager } from "@/components/admin/StaffManager";

export default async function AdminStaffPage() {
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

  const [staff, stores] = await Promise.all([listStaff(), listStores()]);

  return (
    <div className="min-h-screen">
      <StaffHeader title="管理画面" name={session.displayName} backHref="/admin" backLabel="店舗一覧に戻る" />
      <StaffManager initialStaff={staff} stores={stores} currentStaffId={session.staffId} />
    </div>
  );
}
