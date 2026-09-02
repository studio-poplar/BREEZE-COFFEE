import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { getSalesReport } from "@/lib/data/sales";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const querySchema = z.object({
  store_id: z.string().min(1),
  from: z.string().regex(DATE_RE),
  to: z.string().regex(DATE_RE),
});

export async function GET(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    store_id: url.searchParams.get("store_id"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (staff.role !== "admin" && !staff.storeIds.includes(parsed.data.store_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (parsed.data.from > parsed.data.to) {
    return NextResponse.json({ error: "from must not be after to" }, { status: 400 });
  }

  const report = await getSalesReport(parsed.data.store_id, parsed.data.from, parsed.data.to);
  return NextResponse.json({ report });
}
