import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff";
import { getOrderByToken } from "@/lib/data/orders";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { MakerOrderView } from "@/components/register/MakerOrderView";

export default async function MakerOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/register/maker");

  const { token } = await params;
  const order = await getOrderByToken(token.toUpperCase());
  if (!order) notFound();
  if (session.role !== "admin" && !session.storeIds.includes(order.store_id)) {
    return <p className="mt-16 text-center text-sm text-red-500">この店舗の注文ではありません</p>;
  }

  return (
    <div className="min-h-screen">
      <StaffHeader title="メイク画面" name={session.displayName} />
      <MakerOrderView initialOrder={order} />
    </div>
  );
}
