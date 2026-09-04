import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/stores";
import { StoreDisplay } from "@/components/order/StoreDisplay";

// Deliberately its own top-level route, not nested under /order/[storeId] —
// that segment's layout wraps everything in the customer-facing OrderShell
// (LIFF header, bottom nav) and requires a logged-in customer session,
// neither of which belongs on a public counter-facing display screen.
export default async function CustomerDisplayPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await getStore(storeId);
  if (!store) notFound();

  return <StoreDisplay storeId={storeId} initialStoreName={store.name} />;
}
