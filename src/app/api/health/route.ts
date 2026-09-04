import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Public, unauthenticated, deliberately cheap — this exists purely for an
// uptime monitor to poll. It checks real DB connectivity (not just "did
// Next.js respond") since a dead database is the failure mode that actually
// matters for this app.
export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
