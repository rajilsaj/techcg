import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { getLinkPreview } from "@/lib/link-preview";

/**
 * GET /api/link-preview?url=https://…
 * Checks the link exists and returns its preview metadata for the publish form.
 * Logged-in users only, so the server can't be used as an open proxy.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit(session.userId, "preview");
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } }
    );
  }

  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (url.length > 2048) {
    return NextResponse.json({ ok: false, reason: "invalid" });
  }

  // Always 200: a dead link is a normal answer, not a failure of this endpoint.
  return NextResponse.json(await getLinkPreview(url));
}
