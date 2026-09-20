import Link from "next/link";
import Image from "next/image";
import { listMenu } from "@/lib/data/menu";

export default async function MenuPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const items = await listMenu(storeId);

  const categories = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category || "その他";
    if (!categories.has(key)) categories.set(key, []);
    categories.get(key)!.push(item);
  }

  let cardIndex = 0;

  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-5">
      <div className="mb-5 px-1">
        <p className="text-xs font-semibold tracking-wider text-brand-600">TODAY&apos;S MENU</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">今日は何にしますか？</h1>
      </div>

      {categories.size > 1 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {[...categories.keys()].map((category) => (
            <a
              key={category}
              href={`#cat-${category}`}
              className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-[13px] font-medium text-zinc-700"
            >
              {category}
            </a>
          ))}
        </div>
      )}

      {[...categories.entries()].map(([category, categoryItems]) => (
        <section key={category} id={`cat-${category}`} className="mb-7 scroll-mt-20">
          <h2 className="mb-3 px-1 text-[13px] font-bold tracking-wide text-zinc-500">{category}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {categoryItems.map((item) => {
              const delay = `${Math.min(cardIndex++, 8) * 45}ms`;
              return (
                <li key={item.item_id} className="rise-in" style={{ animationDelay: delay }}>
                  <Link
                    href={`/order/${storeId}/item/${item.item_id}`}
                    className="press app-card block overflow-hidden"
                  >
                    <div className="relative aspect-square w-full bg-zinc-100">
                      {item.image_path && (
                        <Image
                          src={item.image_path}
                          alt={item.name}
                          fill
                          sizes="(max-width: 448px) 50vw, 224px"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-lg font-medium leading-none text-zinc-900 shadow-md">
                        +
                      </span>
                    </div>
                    <div className="px-3.5 pb-3.5 pt-3">
                      <p className="text-[15px] font-bold leading-snug">{item.name}</p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums text-zinc-500">
                        ¥{item.price.toLocaleString()}
                        <span className="text-xs text-zinc-400"> 〜</span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {items.length === 0 && (
        <p className="mt-10 text-center text-sm text-zinc-400">現在ご注文いただけるメニューがありません</p>
      )}
    </div>
  );
}
