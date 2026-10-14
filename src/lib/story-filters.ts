import type { Prisma } from "@prisma/client";
import { fromDomain, type StoryOrder } from "./stories";
import { isTopic, TOPICS, type TopicSlug } from "./topic-list";

/**
 * The homepage only shows stories with at least one meta tag (Startups,
 * Entrepreneurs, Tech, Événements): general news from wide sources stays out.
 */
export const HOME_STORIES: Prisma.ItemWhereInput = {
  type: "story",
  tags: { some: { tag: { slug: { in: TOPICS.map((t) => t.slug) } } } },
};

/** Homepage filters, read from the URL (French parameter names). */
export interface StoryFilters {
  q: string;
  topic: TopicSlug | null;
  category: string;
  site: string;
  author: string;
  period: Period | null;
  sort: StoryOrder;
}

export const PERIODS = { "24h": 1, "7j": 7, "30j": 30, "1an": 365 } as const;
export type Period = keyof typeof PERIODS;

/** Latest news first by default. */
export const DEFAULT_SORT: StoryOrder = "newest";
const SORTS: Record<string, StoryOrder> = { recents: "newest", pertinence: "rank", points: "points" };
export const SORT_PARAM: Record<StoryOrder, string> = { newest: "recents", rank: "pertinence", points: "points" };

const MAX_QUERY = 100;
const MAX_WORDS = 8;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Validates raw URL parameters (or values sent back by the client) into filters. */
export function parseStoryFilters(params: Record<string, unknown>): StoryFilters {
  const topic = text(params.sujet, 40);
  const period = text(params.periode, 10);
  const site = text(params.site, 120)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  return {
    q: text(params.q, MAX_QUERY),
    topic: isTopic(topic) ? topic : null,
    category: /^[a-z0-9-]{1,60}$/.test(text(params.categorie, 60)) ? text(params.categorie, 60) : "",
    site: /^[a-z0-9.-]+\.[a-z]{2,}$/.test(site) ? site : "",
    author: /^[\w.-]{1,40}$/.test(text(params.auteur, 40)) ? text(params.auteur, 40) : "",
    period: period in PERIODS ? (period as Period) : null,
    sort: SORTS[text(params.tri, 20)] ?? DEFAULT_SORT,
  };
}

/** Whether any filter other than the default order is set. */
export function hasFilters(f: StoryFilters): boolean {
  return Boolean(f.q || f.topic || f.category || f.site || f.author || f.period);
}

/** Filters that live in the advanced search panel. */
export function hasAdvancedFilters(f: StoryFilters): boolean {
  return Boolean(f.category || f.site || f.author || f.period || f.sort !== DEFAULT_SORT);
}

/** The filters as URL parameters (defaults left out), optionally overriding some. */
export function filtersQuery(f: StoryFilters, override: Partial<StoryFilters> = {}): URLSearchParams {
  const merged = { ...f, ...override };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.topic) params.set("sujet", merged.topic);
  if (merged.category) params.set("categorie", merged.category);
  if (merged.site) params.set("site", merged.site);
  if (merged.author) params.set("auteur", merged.author);
  if (merged.period) params.set("periode", merged.period);
  if (merged.sort !== DEFAULT_SORT) params.set("tri", SORT_PARAM[merged.sort]);
  return params;
}

/** Plain object form, safe to pass to the infinite-scroll server action. */
export function filtersRecord(f: StoryFilters): Record<string, string> {
  return Object.fromEntries(filtersQuery(f));
}

/** The Prisma condition for the filters. Each search word must appear in the title, excerpt, text or tags. */
export function filtersWhere(f: StoryFilters): Prisma.ItemWhereInput {
  const and: Prisma.ItemWhereInput[] = [];

  for (const word of f.q.split(" ").filter(Boolean).slice(0, MAX_WORDS)) {
    const contains = { contains: word, mode: "insensitive" as const };
    and.push({
      OR: [
        { title: contains },
        { originalTitle: contains },
        { excerpt: contains },
        { text: contains },
        { url: contains },
        { tags: { some: { tag: { name: contains } } } },
      ],
    });
  }
  if (f.topic) and.push({ tags: { some: { tag: { slug: f.topic } } } });
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.site) and.push(fromDomain(f.site));
  if (f.author) and.push({ author: { username: { equals: f.author, mode: "insensitive" } } });
  if (f.period) and.push({ createdAt: { gte: new Date(Date.now() - PERIODS[f.period] * 24 * 60 * 60 * 1000) } });

  return and.length > 0 ? { AND: and } : {};
}
