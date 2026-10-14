import { prisma } from "@/lib/db";
import { HOME_STORIES } from "@/lib/story-filters";
import { isGoogleNewsSource } from "@/lib/importer/google-news";
import { displayName, sourceCountry } from "@/lib/source-profile";
import { endpoint, json, preflight } from "@/lib/api/http";

/** GET /api/v1/sources: the sites Tech.cg reads (as on /sources). */
export const GET = endpoint(async () => {
  const [rows, counts] = await Promise.all([
    prisma.importSource.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, url: true, siteName: true, description: true, logoUrl: true, country: true },
    }),
    prisma.item.groupBy({ by: ["importSourceId"], where: { ...HOME_STORIES, importSourceId: { not: null } }, _count: { _all: true } }),
  ]);
  const articles = new Map(counts.map((c) => [c.importSourceId, c._count._all]));
  return json({
    data: rows
      .filter((s) => !isGoogleNewsSource(s.url))
      .map((s) => {
        const url = new URL(s.url);
        return {
          id: s.id,
          name: s.siteName ?? displayName(s.name),
          domain: url.hostname.replace(/^www\./, ""),
          homepage: url.origin,
          country: s.country ?? sourceCountry(s.name, s.url),
          description: s.description,
          logoUrl: s.logoUrl,
          articles: articles.get(s.id) ?? 0,
        };
      }),
  });
});

export const OPTIONS = preflight;
