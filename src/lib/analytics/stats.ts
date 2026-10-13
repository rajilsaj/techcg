import { Prisma } from "@prisma/client";
import { prisma } from "../db";

const DAY_MS = 86_400_000;
/** Days are counted in Brazzaville time (UTC+1). */
const UTC_OFFSET_HOURS = 1;

export interface Period {
  days: number;
  includeBots: boolean;
}

function since(period: Period): Date {
  return new Date(Date.now() - period.days * DAY_MS);
}

function botSql(period: Period): Prisma.Sql {
  return period.includeBots ? Prisma.empty : Prisma.sql`AND "isBot" = false`;
}

export interface Overview {
  views: number;
  visitors: number;
  ips: number;
  sessions: number;
  onlineNow: number;
  avgDurationMs: number | null;
  bounceRate: number | null; // share of sessions with a single page view
}

export async function overview(period: Period): Promise<Overview> {
  const from = since(period);
  const [totals] = await prisma.$queryRaw<
    { views: bigint; visitors: bigint; ips: bigint; sessions: bigint; avg_duration: number | null }[]
  >`
    SELECT count(*) AS views, count(DISTINCT "visitorId") AS visitors, count(DISTINCT ip) AS ips,
           count(DISTINCT "sessionId") AS sessions, avg("durationMs")::float AS avg_duration
    FROM "PageView" WHERE "createdAt" >= ${from} ${botSql(period)}`;
  const [bounce] = await prisma.$queryRaw<{ single: bigint; total: bigint }[]>`
    SELECT count(*) FILTER (WHERE n = 1) AS single, count(*) AS total
    FROM (SELECT "sessionId", count(*) AS n FROM "PageView" WHERE "createdAt" >= ${from} ${botSql(period)} GROUP BY "sessionId") s`;
  const online = await prisma.pageView.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 5 * 60_000) }, isBot: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });

  return {
    views: Number(totals.views),
    visitors: Number(totals.visitors),
    ips: Number(totals.ips),
    sessions: Number(totals.sessions),
    onlineNow: online.length,
    avgDurationMs: totals.avg_duration,
    bounceRate: Number(bounce.total) ? Number(bounce.single) / Number(bounce.total) : null,
  };
}

/** Views and unique visitors per day, oldest first, with empty days filled in. */
export async function daily(period: Period): Promise<{ day: string; count: number; visitors: number }[]> {
  const rows = await prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
    SELECT to_char(("createdAt" + make_interval(hours => ${UTC_OFFSET_HOURS}::int))::date, 'YYYY-MM-DD') AS day,
           count(*) AS views, count(DISTINCT "visitorId") AS visitors
    FROM "PageView" WHERE "createdAt" >= ${since(period)} ${botSql(period)}
    GROUP BY day`;
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: period.days }, (_, i) => {
    const day = new Date(Date.now() - (period.days - 1 - i) * DAY_MS + UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
    const row = byDay.get(day);
    return { day, count: Number(row?.views ?? 0), visitors: Number(row?.visitors ?? 0) };
  });
}

type Dimension = "path" | "country" | "city" | "browser" | "os" | "device" | "screen" | "language";

/** Top values of one dimension, by views, with their unique visitors. */
export async function top(period: Period, dimension: Dimension, limit = 8): Promise<{ value: string; views: number; visitors: number }[]> {
  const column = Prisma.raw(`"${dimension}"`);
  const rows = await prisma.$queryRaw<{ value: string | null; views: bigint; visitors: bigint }[]>`
    SELECT ${column} AS value, count(*) AS views, count(DISTINCT "visitorId") AS visitors
    FROM "PageView" WHERE "createdAt" >= ${since(period)} ${botSql(period)}
    GROUP BY ${column} ORDER BY views DESC LIMIT ${limit}`;
  return rows.map((r) => ({ value: r.value ?? "Inconnu", views: Number(r.views), visitors: Number(r.visitors) }));
}

/** Referring sites, grouped by host. */
export async function topReferrers(period: Period, limit = 8) {
  const rows = await prisma.$queryRaw<{ host: string; views: bigint }[]>`
    SELECT substring(referrer from '^https?://(?:www\\.)?([^/]+)') AS host, count(*) AS views
    FROM "PageView" WHERE "createdAt" >= ${since(period)} AND referrer IS NOT NULL ${botSql(period)}
    GROUP BY host ORDER BY views DESC LIMIT ${limit}`;
  return rows.map((r) => ({ value: r.host, views: Number(r.views) }));
}

export interface IpRow {
  ip: string;
  views: number;
  sessions: number;
  visitors: number;
  firstSeen: Date;
  lastSeen: Date;
  country: string | null;
  city: string | null;
  region: string | null;
  browser: string | null;
  os: string | null;
  device: string;
  isBot: boolean;
  usernames: string[];
}

/** One row per IP address, most recently seen first. `search` matches IP, city or country. */
export async function ipTable(period: Period, page: number, perPage: number, search?: string): Promise<{ rows: IpRow[]; total: number }> {
  const like = search ? `%${search}%` : null;
  const filter = like ? Prisma.sql`AND (ip ILIKE ${like} OR city ILIKE ${like} OR country ILIKE ${like})` : Prisma.empty;
  const where = Prisma.sql`"createdAt" >= ${since(period)} ${botSql(period)} ${filter}`;

  const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`SELECT count(DISTINCT ip) AS total FROM "PageView" WHERE ${where}`;
  const rows = await prisma.$queryRaw<
    (Omit<IpRow, "views" | "sessions" | "visitors" | "usernames"> & { views: bigint; sessions: bigint; visitors: bigint; user_ids: number[] | null })[]
  >`
    SELECT ip,
           count(*) AS views,
           count(DISTINCT "sessionId") AS sessions,
           count(DISTINCT "visitorId") AS visitors,
           min("createdAt") AS "firstSeen",
           max("createdAt") AS "lastSeen",
           (array_agg(country ORDER BY "createdAt" DESC))[1] AS country,
           (array_agg(city ORDER BY "createdAt" DESC))[1] AS city,
           (array_agg(region ORDER BY "createdAt" DESC))[1] AS region,
           (array_agg(browser ORDER BY "createdAt" DESC))[1] AS browser,
           (array_agg(os ORDER BY "createdAt" DESC))[1] AS os,
           (array_agg(device ORDER BY "createdAt" DESC))[1] AS device,
           bool_or("isBot") AS "isBot",
           array_agg(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL) AS user_ids
    FROM "PageView" WHERE ${where}
    GROUP BY ip ORDER BY "lastSeen" DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`;

  const userIds = [...new Set(rows.flatMap((r) => r.user_ids ?? []))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.username]));

  return {
    total: Number(total),
    rows: rows.map(({ user_ids, views, sessions, visitors, ...r }) => ({
      ...r,
      views: Number(views),
      sessions: Number(sessions),
      visitors: Number(visitors),
      usernames: (user_ids ?? []).map((id) => names.get(id)).filter((n): n is string => !!n),
    })),
  };
}

/** Everything recorded for one IP, newest first. */
export async function ipDetail(ip: string, limit = 300) {
  const [views, total] = await Promise.all([
    prisma.pageView.findMany({ where: { ip }, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.pageView.count({ where: { ip } }),
  ]);
  const userIds = [...new Set(views.map((v) => v.userId).filter((id): id is number => id !== null))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } }) : [];
  return { views, total, users };
}

