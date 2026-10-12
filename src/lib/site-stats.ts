import { prisma } from "./db";
import { getDomain } from "./utils";
import { publiclyVisible } from "./content-status";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days are counted in Brazzaville time (UTC+1, no daylight saving). */
const UTC_OFFSET_HOURS = 1;
const POST_TYPES = ["story", "ask", "show", "job"];

export interface Total {
  total: number;
  last30: number;
}

export interface SiteStats {
  members: Total;
  posts: Total;
  comments: Total;
  likes: Total;
  /** Publications per day over the last 30 days, oldest first. */
  dailyPosts: { day: string; count: number }[];
  topDomains: { domain: string; count: number }[];
  activeMembers: { username: string; count: number }[];
}

export async function getSiteStats(now = Date.now()): Promise<SiteStats> {
  const since30 = new Date(now - 30 * DAY_MS);
  const live = publiclyVisible(new Date(now));

  const windowed = async (count: (where: { gte: Date }) => Promise<number>, total: Promise<number>) => {
    const [all, last30] = await Promise.all([total, count({ gte: since30 })]);
    return { total: all, last30 };
  };

  const [members, posts, comments, likes, dailyRows, linkRows, activeRows] = await Promise.all([
    windowed((createdAt) => prisma.user.count({ where: { createdAt } }), prisma.user.count()),
    windowed(
      (createdAt) => prisma.item.count({ where: { ...live, type: { in: POST_TYPES }, createdAt } }),
      prisma.item.count({ where: { ...live, type: { in: POST_TYPES } } })
    ),
    windowed(
      (createdAt) => prisma.item.count({ where: { ...live, type: "comment", createdAt } }),
      prisma.item.count({ where: { ...live, type: "comment" } })
    ),
    // Votes have no timestamp; count them by the age of the liked item instead.
    windowed(
      (createdAt) => prisma.vote.count({ where: { item: { createdAt } } }),
      prisma.vote.count()
    ),
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT to_char(("createdAt" + make_interval(hours => ${UTC_OFFSET_HOURS}::int))::date, 'YYYY-MM-DD') AS day,
             count(*) AS count
      FROM "Item"
      WHERE type <> 'comment' AND "createdAt" >= ${since30}
        AND (status = 'published' OR (status = 'scheduled' AND "publishAt" <= now()))
      GROUP BY day`,
    prisma.item.findMany({
      where: { ...live, type: { in: POST_TYPES }, url: { not: null }, author: { shadowBanned: false } },
      select: { url: true },
      orderBy: { id: "desc" },
      take: 2000,
    }),
    prisma.item.groupBy({
      by: ["authorId"],
      where: { ...live, createdAt: { gte: since30 }, author: { shadowBanned: false } },
      _count: { _all: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 5,
    }),
  ]);

  const counts = new Map(dailyRows.map((r) => [r.day, Number(r.count)]));
  const dailyPosts = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now - (29 - i) * DAY_MS + UTC_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });

  const domainCounts = new Map<string, number>();
  for (const { url } of linkRows) {
    const domain = url ? getDomain(url) : "";
    if (domain) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }
  const topDomains = [...domainCounts]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 5);

  const users = await prisma.user.findMany({
    where: { id: { in: activeRows.map((r) => r.authorId) } },
    select: { id: true, username: true },
  });
  const names = new Map(users.map((u) => [u.id, u.username]));
  const activeMembers = activeRows
    .map((r) => ({ username: names.get(r.authorId) ?? "", count: r._count._all }))
    .filter((m) => m.username);

  return { members, posts, comments, likes, dailyPosts, topDomains, activeMembers };
}
