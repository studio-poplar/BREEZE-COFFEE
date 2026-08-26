import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/data/orders";
import { TicketView } from "@/components/order/TicketView";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ storeId: string; token: string }>;
}) {
  const { storeId, token } = await params;
  const order = getOrderByToken(token);
  if (!order || order.store_id !== storeId) notFound();

  return <TicketView storeId={storeId} initialOrder={order} />;
}
