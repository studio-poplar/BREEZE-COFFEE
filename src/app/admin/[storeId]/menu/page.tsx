import { notFound } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff";
import { getStore } from "@/lib/data/stores";
import { listMenu } from "@/lib/data/menu";
import { StaffLoginForm } from "@/components/staff/LoginForm";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { AdminMenu } from "@/components/admin/AdminMenu";

export default async function AdminStoreMenuPage({
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

  const items = await listMenu(storeId, { includeInactive: true });

  return (
    <div className="min-h-screen">
      <StaffHeader title={`管理画面 - ${store.name}`} name={session.displayName} />
      <AdminMenu storeId={storeId} initialItems={items} />
    </div>
  );
}
