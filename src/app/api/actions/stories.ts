"use server";

import { getSession } from "@/lib/auth";
import { listStories, type ListedStory } from "@/lib/stories";
import { filtersWhere, parseStoryFilters } from "@/lib/story-filters";

/** Feeds the client may page through. Keys map to fixed queries. */
const FEEDS = {
  top: { where: { type: "story" } },
} as const;

export type Feed = keyof typeof FEEDS;

/**
 * Next page of a feed, for infinite scroll. `filters` are the page's URL filters;
 * they're validated again here, so the client can't send arbitrary queries.
 */
export async function loadMoreStoriesAction(
  feed: Feed,
  cursor: string,
  filters: Record<string, string> = {},
  /** Stories already shown above the list (the Congo block). */
  excludeIds: number[] = []
): Promise<{ stories: ListedStory[]; nextCursor?: string }> {
  const config = FEEDS[feed];
  if (!config || typeof cursor !== "string" || cursor.length > 200) return { stories: [] };

  const f = parseStoryFilters(filters && typeof filters === "object" ? filters : {});
  const session = await getSession();
  const exclude = Array.isArray(excludeIds) ? excludeIds.filter((id) => Number.isInteger(id) && id > 0).slice(0, 10) : [];
  return listStories({
    where: { AND: [config.where, filtersWhere(f), exclude.length ? { id: { notIn: exclude } } : {}] },
    order: f.sort,
    cursor,
    viewerId: session?.userId,
  });
}
