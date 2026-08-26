import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth/staff";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ staff: null });
  return NextResponse.json({ staff: session });
}
