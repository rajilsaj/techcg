import { prisma } from "./db";
import { publiclyVisible } from "./content-status";
import { HOME_STORIES } from "./story-filters";

/** The count shown is capped: "99+" is enough to say "a lot". */
const MAX_COUNT = 100;

/** Newest homepage story id (publication order, not the article's own date: imports keep theirs). */
export async function latestHomeStoryId(): Promise<number> {
  const latest = await prisma.item.findFirst({ where: { AND: [HOME_STORIES, publiclyVisible()] }, orderBy: { id: "desc" }, select: { id: true } });
  return latest?.id ?? 0;
}

/** Homepage stories published after story `since`, and the newest id. */
export async function homeStoriesSince(since: number): Promise<{ count: number; latestId: number }> {
  const [count, latestId] = await Promise.all([
    prisma.item.count({ where: { AND: [HOME_STORIES, publiclyVisible(), { id: { gt: since } }] }, take: MAX_COUNT }),
    latestHomeStoryId(),
  ]);
  return { count, latestId };
}
