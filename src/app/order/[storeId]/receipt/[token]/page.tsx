import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/data/orders";
import { getStore } from "@/lib/data/stores";
import { ReceiptDocument } from "@/components/receipt/ReceiptDocument";

export default async function CustomerReceiptPage({
  params,
}: {
  params: Promise<{ storeId: string; token: string }>;
}) {
  const { storeId, token } = await params;
  const order = await getOrderByToken(token);
  if (!order || order.store_id !== storeId) notFound();
  if (order.status === "unpaid") {
    return <p className="mt-16 text-center text-sm text-zinc-400">会計が完了するとレシートを表示できます</p>;
  }

  const store = await getStore(storeId);
  if (!store) notFound();

  return <ReceiptDocument order={order} store={store} />;
}
