import Link from "next/link";
import Image from "next/image";
import { listMenu } from "@/lib/data/menu";

export default async function MenuPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const items = listMenu(storeId);

  const categories = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category || "その他";
    if (!categories.has(key)) categories.set(key, []);
    categories.get(key)!.push(item);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      {[...categories.entries()].map(([category, categoryItems]) => (
        <section key={category} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">{category}</h2>
          <ul className="flex flex-col gap-2">
            {categoryItems.map((item) => (
              <li key={item.item_id}>
                <Link
                  href={`/order/${storeId}/item/${item.item_id}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    {item.image_path && (
                      <Image
                        src={item.image_path}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-500">¥{item.price.toLocaleString()}〜</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {items.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-400">現在ご注文いただけるメニューがありません</p>
      )}
    </div>
  );
}
