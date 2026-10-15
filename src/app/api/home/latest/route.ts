import { NextRequest, NextResponse } from "next/server";
import { homeStoriesSince } from "@/lib/home-latest";

/**
 * GET /api/home/latest?since=<id>: how many homepage stories were published after
 * story `since` (imports from the cron job, members' posts). Polled by the homepage
 * to offer « N nouveaux articles » without a reload.
 */
export async function GET(request: NextRequest) {
  const since = parseInt(request.nextUrl.searchParams.get("since") ?? "", 10);
  const headers = { "Cache-Control": "no-store" };
  if (!Number.isInteger(since) || since < 0) {
    return NextResponse.json({ error: { code: "bad_request", message: "Paramètre since invalide." } }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await homeStoriesSince(since), { headers });
  } catch {
    return NextResponse.json({ error: { code: "internal", message: "Erreur interne." } }, { status: 500, headers });
  }
}
