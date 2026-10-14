/**
 * Meta tags and regions, without database access (safe in client components);
 * detection and tagging are in topics.ts.
 *
 * The site's meta tags: the only tags shown on stories and offered as homepage
 * categories. Each one is also a tag (same slug), so stories carry them like any
 * other tag and appear on /etiquette/<slug>.
 */
export const TOPICS = [
  { slug: "startups", label: "Startups" },
  { slug: "entrepreneurs", label: "Entrepreneurs" },
  { slug: "tech", label: "Tech" },
  { slug: "evenements", label: "Événements" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export function isTopic(value: string | null | undefined): value is TopicSlug {
  return TOPICS.some((topic) => topic.slug === value);
}

/**
 * Where a story is about, also kept as a tag: Congo (both Congos) or the rest of
 * Africa. Stories with neither are "Monde". The homepage leads with 5 Congo, then
 * 5 Africa stories.
 */
export const REGIONS = [
  { slug: "congo", label: "Congo" },
  { slug: "afrique", label: "Afrique" },
] as const;
export type RegionSlug = (typeof REGIONS)[number]["slug"];

export function isRegion(value: unknown): value is RegionSlug {
  return REGIONS.some((region) => region.slug === value);
}
