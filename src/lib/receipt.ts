/**
 * Menu prices are entered tax-inclusive (総額表示), so a receipt only needs to
 * back out the embedded consumption tax for display — it never changes the
 * charged total. Every item in this app is taxed at the standard 10% rate
 * (there is no dine-in/takeout distinction to drive the 8% reduced rate),
 * so that's the only rate this computes.
 */
const TAX_RATE = 0.1;

export function splitTax(totalInclusive: number): { exclusive: number; tax: number } {
  const exclusive = Math.floor(totalInclusive / (1 + TAX_RATE));
  return { exclusive, tax: totalInclusive - exclusive };
}

export function formatReceiptDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
