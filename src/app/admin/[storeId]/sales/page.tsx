import { notFound } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff";
import { getStore } from "@/lib/data/stores";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { SalesReport } from "@/components/admin/SalesReport";
import { AdminStoreNav } from "@/components/admin/AdminStoreNav";

export default async function AdminStoreSalesPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await getStaffSession();
  if (!session) return <StaffLoginForm title="管理画面 ログイン" />;

  const { storeId } = await params;
  const store = await getStore(storeId);
  if (!store) notFound();
  if (session.role !== "admin" && !session.storeIds.includes(storeId)) {
    return <p className="mt-16 text-center text-sm text-zinc-400">この店舗を管理する権限がありません</p>;
  }

  return (
    <div className="min-h-screen">
      <StaffHeader
        title={`管理画面 - ${store.name}`}
        name={session.displayName}
        backHref="/admin"
        backLabel="店舗一覧に戻る"
      />
      <AdminStoreNav storeId={storeId} active="sales" />
      <SalesReport storeId={storeId} />
    </div>
  );
}
