import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/staff";
import { getOrderByToken } from "@/lib/data/orders";
import { getStore } from "@/lib/data/stores";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { InvoiceDocument } from "@/components/receipt/InvoiceDocument";

export default async function RegisterInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/register");

  const { token } = await params;
  const order = await getOrderByToken(token.toUpperCase());
  if (!order) notFound();
  if (session.role !== "admin" && !session.storeIds.includes(order.store_id)) {
    return <p className="mt-16 text-center text-sm text-red-500">この店舗の注文ではありません</p>;
  }
  if (order.status === "unpaid") {
    return <p className="mt-16 text-center text-sm text-zinc-400">会計が完了すると領収書を発行できます</p>;
  }

  const store = await getStore(order.store_id);
  if (!store) notFound();

  return (
    <div className="min-h-screen print:min-h-0">
      <div className="print:hidden">
        <StaffHeader title="領収書発行" name={session.displayName} />
      </div>
      <InvoiceDocument order={order} store={store} />
    </div>
  );
}
