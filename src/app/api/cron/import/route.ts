import { NextRequest, NextResponse } from "next/server";
import { runDueImports } from "@/lib/importer/schedule";

// Imports can take a while (fetching feeds, translating titles).
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; other schedulers may use `x-cron-secret`. */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

/** Imports every due source (see runDueImports), then refreshes ranking. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  }
  try {
    const tick = await runDueImports({ budgetMs: 240_000 });
    return NextResponse.json({ ok: true, ...tick });
  } catch (err) {
    console.error("[cron/import] failed:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Import failed" } }, { status: 500 });
  }
}

export const POST = GET;
