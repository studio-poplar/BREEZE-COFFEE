import { notFound } from "next/navigation";
import { getMenuItem } from "@/lib/data/menu";
import { ItemCustomizer } from "@/components/order/ItemCustomizer";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ storeId: string; itemId: string }>;
}) {
  const { storeId, itemId } = await params;
  const item = getMenuItem(itemId);
  if (!item || item.store_id !== storeId || !item.active) notFound();

  return <ItemCustomizer storeId={storeId} item={item} />;
}
