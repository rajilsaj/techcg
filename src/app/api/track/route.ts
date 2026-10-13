import { randomUUID } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cleanReferrer, requestInfo } from "@/lib/analytics/request-info";
import { parseUserAgent } from "@/lib/analytics/user-agent";

const VISITOR_COOKIE = "vid";
const VISITOR_MAX_AGE = 365 * 24 * 60 * 60;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
const RATE_PER_MINUTE = 120;

// Per-instance rate limit by IP; enough to stop a runaway client from flooding the table.
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  return ++entry.count > RATE_PER_MINUTE;
}

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

/** Public pages only: no admin, API or asset paths. */
function trackablePath(value: unknown): string | null {
  const path = text(value, 300);
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  if (/^\/(godmod|api|_next)(\/|$)/.test(path)) return null;
  return path.split("?")[0].split("#")[0];
}

/**
 * POST /api/track
 *   { type: "view", path, referrer, screen, language, tz, sessionId } → { id }
 *   { type: "leave", id, durationMs } (sent with sendBeacon when the page is left)
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new NextResponse(null, { status: 400 });

  const info = requestInfo(request.headers);
  if (rateLimited(info.ip)) return new NextResponse(null, { status: 429 });

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;

  if (body.type === "leave") {
    const id = Number(body.id);
    const duration = Number(body.durationMs);
    if (visitorId && Number.isInteger(id) && Number.isFinite(duration)) {
      await prisma.pageView.updateMany({
        where: { id, visitorId, durationMs: null, createdAt: { gte: new Date(Date.now() - MAX_DURATION_MS) } },
        data: { durationMs: Math.round(Math.min(Math.max(duration, 0), MAX_DURATION_MS)) },
      });
    }
    return new NextResponse(null, { status: 204 });
  }

  const path = trackablePath(body.path);
  if (body.type !== "view" || !path) return new NextResponse(null, { status: 400 });

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const vid = visitorId && /^[\w-]{10,64}$/.test(visitorId) ? visitorId : randomUUID();
  const session = await getSession();

  const view = await prisma.pageView.create({
    data: {
      path,
      referrer: cleanReferrer(body.referrer, request.headers.get("host")),
      ...info,
      userAgent,
      ...parseUserAgent(userAgent),
      screen: text(body.screen, 20)?.match(/^\d{2,5}x\d{2,5}$/)?.[0] ?? null,
      language: text(body.language, 20),
      clientTz: text(body.tz, 60),
      visitorId: vid,
      sessionId: text(body.sessionId, 64)?.match(/^[\w-]+$/)?.[0] ?? vid,
      userId: session?.userId ?? null,
    },
    select: { id: true },
  });

  // Now and then, delete visits older than the retention period.
  if (Math.random() < 0.02) {
    after(async () => {
      const { analyticsRetentionDays } = await getSettings();
      await prisma.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - analyticsRetentionDays * 86_400_000) } } });
    });
  }

  const response = NextResponse.json({ id: view.id });
  if (vid !== visitorId) {
    response.cookies.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: VISITOR_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
