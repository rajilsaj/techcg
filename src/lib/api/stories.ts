import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listStories, type StoryOrder } from "@/lib/stories";
import { filtersWhere, HOME_STORIES, parseStoryFilters, PERIODS } from "@/lib/story-filters";
import { isRegion, isTopic, TOPICS, REGIONS } from "@/lib/topic-list";
import { publiclyVisible } from "@/lib/content-status";
import { avatarUrl } from "@/lib/gravatar";
import { viewerVotes } from "@/lib/votes";
import { STORY_TYPES } from "@/lib/publish";
import { ApiError, beforeParam, limitParam } from "./http";
import { storyJson, type CommentJson } from "./serialize";
import type { ApiCaller } from "./keys";

/** API sort names → the site's orders (the homepage tabs and the filter sentence). */
export const API_SORTS: Record<string, StoryOrder> = {
  newest: "newest",
  popular: "views",
  discussed: "comments",
  trending: "rank",
  top: "points",
};

function oneOf<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T | undefined {
  const value = params.get(name);
  if (value === null || value === "") return undefined;
  if (!(allowed as readonly string[]).includes(value)) throw new ApiError("validation", `${name} doit valoir : ${allowed.join(", ")}.`, { field: name, allowed });
  return value as T;
}

/** GET /api/v1/stories: the site's lists with the same filters. */
export async function storiesFromQuery(params: URLSearchParams, caller: ApiCaller | null, origin: string) {
  const sort = oneOf(params, "sort", Object.keys(API_SORTS)) ?? "newest";
  const type = oneOf(params, "type", STORY_TYPES) ?? "story";
  const scope = oneOf(params, "scope", ["home", "all"] as const) ?? "home";
  const topic = oneOf(params, "topic", TOPICS.map((t) => t.slug));
  const region = oneOf(params, "region", REGIONS.map((r) => r.slug));
  const period = oneOf(params, "period", Object.keys(PERIODS));
  const limit = limitParam(params);

  const filters = parseStoryFilters({
    q: params.get("q") ?? "",
    sujet: topic ?? "",
    site: params.get("site") ?? "",
    auteur: params.get("author") ?? "",
    periode: period ?? "",
  });
  const where: Prisma.ItemWhereInput[] = [{ type }, filtersWhere(filters)];
  // « home »: what the site lists (stories with a topic: tech, startups, entrepreneurs, events).
  if (type === "story" && scope === "home") where.push(HOME_STORIES);
  if (region && isRegion(region)) where.push({ tags: { some: { tag: { slug: region } } } });
  if (topic && !isTopic(topic)) throw new ApiError("validation");

  const { stories, nextCursor } = await listStories({
    where: { AND: where },
    order: API_SORTS[sort],
    cursor: params.get("cursor") ?? undefined,
    viewerId: caller?.userId,
    take: limit,
  });
  return { data: stories.map((s) => storyJson(s, origin)), meta: { sort, limit, nextCursor: nextCursor ?? null } };
}

/** One publication (story, question, show, job) as JSON, or a 404. */
export async function storyById(id: number, caller: ApiCaller | null, origin: string) {
  // Without the viewer: a story they hid stays readable by its id.
  const { stories } = await listStories({ where: { id, type: { not: "comment" } }, order: "newest", take: 1 });
  if (!stories[0]) throw new ApiError("not_found", "Publication introuvable.");
  const vote = (await viewerVotes(caller?.userId, [id])).get(id) ?? 0;
  return storyJson({ ...stories[0], vote }, origin);
}

/** Published comments, newest first, `?before=<id>` for the next page. */
export async function commentsPage(params: URLSearchParams, storyId?: number) {
  const limit = limitParam(params, 50, 200);
  const before = beforeParam(params);
  const rows = await prisma.item.findMany({
    where: {
      type: "comment",
      ...publiclyVisible(),
      author: { shadowBanned: false },
      ...(storyId ? { parentId: storyId } : { parent: { ...publiclyVisible() } }),
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit + 1,
    select: { id: true, parentId: true, text: true, points: true, createdAt: true, author: { select: { username: true, email: true } } },
  });
  const page = rows.slice(0, limit);
  const data: CommentJson[] = page.map((c) => ({
    id: c.id,
    storyId: c.parentId,
    text: c.text ?? "",
    points: c.points,
    author: { username: c.author.username, avatarUrl: avatarUrl(c.author.email, c.author.username) },
    createdAt: c.createdAt.toISOString(),
  }));
  return { data, meta: { limit, nextBefore: rows.length > limit ? page[page.length - 1].id : null } };
}

/** A publication the caller may change: their own, or any for an admin. */
export async function ownStory(id: number, caller: ApiCaller) {
  const story = await prisma.item.findUnique({ where: { id }, select: { id: true, type: true, authorId: true, url: true, status: true } });
  if (!story || story.type === "comment" || story.status === "trash") throw new ApiError("not_found", "Publication introuvable.");
  if (story.authorId !== caller.userId && !caller.isAdmin) throw new ApiError("forbidden", "Seul l'auteur (ou un administrateur) peut modifier cette publication.");
  return story;
}
