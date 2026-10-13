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
  filters: Record<string, string> = {}
): Promise<{ stories: ListedStory[]; nextCursor?: string }> {
  const config = FEEDS[feed];
  if (!config || typeof cursor !== "string" || cursor.length > 200) return { stories: [] };

  const f = parseStoryFilters(filters && typeof filters === "object" ? filters : {});
  const session = await getSession();
  return listStories({
    where: { AND: [config.where, filtersWhere(f)] },
    order: f.sort,
    cursor,
    viewerId: session?.userId,
  });
}
