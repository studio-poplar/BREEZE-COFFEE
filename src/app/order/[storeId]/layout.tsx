import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/stores";
import { CustomerAuthProvider } from "@/lib/client/customer-auth";
import { OrderShell } from "@/components/order/OrderShell";

export default async function OrderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await getStore(storeId);
  if (!store || !store.active) notFound();

  return (
    <CustomerAuthProvider>
      <OrderShell store={store}>{children}</OrderShell>
    </CustomerAuthProvider>
  );
}
