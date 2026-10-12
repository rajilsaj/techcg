"use server";

import { getSession } from "@/lib/auth";
import { listStories, type ListedStory } from "@/lib/stories";

/** Feeds the client may page through. Keys map to fixed queries; clients never send filters. */
const FEEDS = {
  top: { where: { type: "story" }, order: "rank" },
} as const;

export type Feed = keyof typeof FEEDS;

/** Next page of a feed, for infinite scroll. */
export async function loadMoreStoriesAction(
  feed: Feed,
  cursor: string
): Promise<{ stories: ListedStory[]; nextCursor?: string }> {
  const config = FEEDS[feed];
  if (!config || typeof cursor !== "string" || cursor.length > 200) return { stories: [] };

  const session = await getSession();
  return listStories({ where: config.where, order: config.order, cursor, viewerId: session?.userId });
}
