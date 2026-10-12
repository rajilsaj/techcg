import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { enrichStories, needsEnrichment } from "./enrich-story";
import { publiclyVisible } from "./content-status";

export const STORIES_PER_PAGE = 30;
/** Previews fetched per page view for stories that don't have one yet. */
const ENRICH_PER_VIEW = 5;

const storySelect = {
  id: true,
  type: true,
  title: true,
  url: true,
  text: true,
  excerpt: true,
  excerptLang: true,
  imageUrl: true,
  previewAt: true,
  points: true,
  rankScore: true,
  commentCount: true,
  createdAt: true,
  author: { select: { username: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ItemSelect;

export type StoryRecord = Prisma.ItemGetPayload<{ select: typeof storySelect }>;
export type ListedStory = StoryRecord & { voted: boolean };

export type StoryOrder = "rank" | "newest" | "points";

interface Cursor {
  key: number;
  id: number;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const { key, id } = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof key === "number" && Number.isInteger(id) ? { key, id } : null;
  } catch {
    return null;
  }
}

const ORDER: Record<StoryOrder, { field: "rankScore" | "id" | "points"; orderBy: Prisma.ItemOrderByWithRelationInput[] }> = {
  rank: { field: "rankScore", orderBy: [{ rankScore: "desc" }, { id: "desc" }] },
  newest: { field: "id", orderBy: [{ id: "desc" }] },
  points: { field: "points", orderBy: [{ points: "desc" }, { id: "desc" }] },
};

function afterCursor(order: StoryOrder, cursor: Cursor | null): Prisma.ItemWhereInput {
  if (!cursor) return {};
  const { field } = ORDER[order];
  if (field === "id") return { id: { lt: cursor.id } };
  return {
    OR: [{ [field]: { lt: cursor.key } }, { [field]: cursor.key, id: { lt: cursor.id } }],
  };
}

export interface ListStoriesOptions {
  where: Prisma.ItemWhereInput;
  order: StoryOrder;
  cursor?: string;
  viewerId?: number | null;
  take?: number;
  /** Profile pages still list a shadow-banned author's own stories. */
  includeShadowBanned?: boolean;
}

/**
 * One page of stories: only publicly visible ones, without shadow-banned authors or stories
 * the viewer hid; marks the viewer's votes; and schedules preview fetching for
 * stories that don't have an image/excerpt yet (after the response is sent).
 */
export async function listStories({
  where,
  order,
  cursor,
  viewerId,
  take = STORIES_PER_PAGE,
  includeShadowBanned = false,
}: ListStoriesOptions) {
  const rows = await prisma.item.findMany({
    where: {
      AND: [
        where,
        publiclyVisible(),
        includeShadowBanned ? {} : { author: { shadowBanned: false } },
        viewerId ? { hiddenBy: { none: { userId: viewerId } } } : {},
        afterCursor(order, decodeCursor(cursor)),
      ],
    },
    orderBy: ORDER[order].orderBy,
    take: take + 1,
    select: storySelect,
  });

  const hasNext = rows.length > take;
  const page = rows.slice(0, take);

  const votedIds = new Set<number>();
  if (viewerId && page.length > 0) {
    const votes = await prisma.vote.findMany({
      where: { userId: viewerId, itemId: { in: page.map((s) => s.id) } },
      select: { itemId: true },
    });
    for (const vote of votes) votedIds.add(vote.itemId);
  }

  const pending = page.filter((s) => needsEnrichment(s)).map((s) => s.id).slice(0, ENRICH_PER_VIEW);
  if (pending.length > 0) after(() => enrichStories(pending));

  const last = page[page.length - 1];
  const field = ORDER[order].field;
  return {
    stories: page.map((s): ListedStory => ({ ...s, voted: votedIds.has(s.id) })),
    nextCursor: hasNext && last ? encodeCursor({ key: field === "id" ? last.id : last[field], id: last.id }) : undefined,
  };
}

/** Stories linking to `domain` (with or without www). */
export function fromDomain(domain: string): Prisma.ItemWhereInput {
  const hosts = [domain, `www.${domain}`];
  return {
    OR: hosts.flatMap((host) =>
      ["http", "https"].flatMap((scheme) => [
        { url: `${scheme}://${host}` },
        { url: { startsWith: `${scheme}://${host}/` } },
        { url: { startsWith: `${scheme}://${host}?` } },
      ])
    ),
  };
}
