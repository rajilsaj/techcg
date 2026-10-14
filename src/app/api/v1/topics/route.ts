import { prisma } from "@/lib/db";
import { REGIONS, TOPICS } from "@/lib/topic-list";
import { endpoint, ok, preflight } from "@/lib/api/http";

/** GET /api/v1/topics: the topics, regions and categories used to filter stories. */
export const GET = endpoint(async () => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  return ok({
    topics: TOPICS.map((t) => ({ slug: t.slug, name: t.label })),
    regions: REGIONS.map((r) => ({ slug: r.slug, name: r.label })),
    categories,
  });
});

export const OPTIONS = preflight;
