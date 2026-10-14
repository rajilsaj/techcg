import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { publiclyVisible } from "./content-status";
import { avatarUrl } from "./gravatar";

/*
 * « En discussion »: every publication's comments read as a chat. A conversation
 * is in progress while people keep writing; members can also open a free-topic
 * one (an "ask" item) or start the conversation on an article.
 */

/** Conversations listed: those with a message (or opened) in the last 30 days. */
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** « En direct »: a message in the last 24 hours. */
export const LIVE_MS = 24 * 60 * 60 * 1000;
const MAX_THREADS = 60;

export type DiscussionKind = "article" | "libre";

export interface DiscussionSummary {
  id: number;
  title: string;
  kind: DiscussionKind;
  url: string | null;
  imageUrl: string | null;
  tagSlugs: string[];
  messages: number;
  lastAt: Date;
  last: { username: string; text: string } | null;
  participants: { username: string; avatarUrl: string }[];
}

/** Published comments by members who aren't shadow-banned. */
const visibleMessage = (): Prisma.ItemWhereInput => ({ type: "comment", ...publiclyVisible(), author: { shadowBanned: false } });

/** Conversations in progress, latest activity first. */
export async function listDiscussions(kind?: DiscussionKind): Promise<DiscussionSummary[]> {
  const since = new Date(Date.now() - WINDOW_MS);
  const kindWhere: Prisma.ItemWhereInput = kind === "libre" ? { type: "ask" } : kind === "article" ? { type: { not: "ask" } } : {};

  const [active, opened] = await Promise.all([
    prisma.item.groupBy({
      by: ["parentId"],
      where: { ...visibleMessage(), parentId: { not: null }, createdAt: { gte: since } },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: MAX_THREADS,
    }),
    // Free topics just opened, before anyone answers.
    kind === "article"
      ? Promise.resolve([])
      : prisma.item.findMany({ where: { type: "ask", createdAt: { gte: since }, ...publiclyVisible() }, select: { id: true, createdAt: true }, take: MAX_THREADS }),
  ]);

  const lastAt = new Map<number, Date>();
  for (const g of active) if (g.parentId && g._max.createdAt) lastAt.set(g.parentId, g._max.createdAt);
  for (const o of opened) if (!lastAt.has(o.id)) lastAt.set(o.id, o.createdAt);
  if (lastAt.size === 0) return [];

  const ids = [...lastAt.keys()];
  const [threads, messages] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: ids }, type: { not: "comment" }, ...publiclyVisible(), author: { shadowBanned: false }, ...kindWhere },
      select: { id: true, type: true, title: true, url: true, imageUrl: true, commentCount: true, tags: { select: { tag: { select: { slug: true } } } } },
    }),
    prisma.item.findMany({
      where: { ...visibleMessage(), parentId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: ids.length * 6,
      select: { parentId: true, text: true, author: { select: { username: true, email: true } } },
    }),
  ]);

  const byThread = new Map<number, typeof messages>();
  for (const m of messages) if (m.parentId) byThread.set(m.parentId, [...(byThread.get(m.parentId) ?? []), m]);

  return threads
    .map((t): DiscussionSummary => {
      const recent = byThread.get(t.id) ?? [];
      const people = new Map<string, string>();
      for (const m of recent) if (!people.has(m.author.username)) people.set(m.author.username, avatarUrl(m.author.email, m.author.username));
      return {
        id: t.id,
        title: t.title ?? "Sans titre",
        kind: t.type === "ask" ? "libre" : "article",
        url: t.url,
        imageUrl: t.imageUrl,
        tagSlugs: t.tags.map((x) => x.tag.slug),
        messages: t.commentCount,
        lastAt: lastAt.get(t.id)!,
        last: recent[0] ? { username: recent[0].author.username, text: oneLine(recent[0].text) } : null,
        participants: [...people].slice(0, 4).map(([username, url]) => ({ username, avatarUrl: url })),
      };
    })
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/** How many conversations had a message in the last 24 hours (the dot on the homepage). */
export async function liveDiscussionCount(): Promise<number> {
  const rows = await prisma.item.groupBy({
    by: ["parentId"],
    where: { ...visibleMessage(), parentId: { not: null }, createdAt: { gte: new Date(Date.now() - LIVE_MS) } },
  });
  return rows.length;
}

export interface ChatMessage {
  id: number;
  text: string;
  createdAt: Date;
  username: string;
  avatarUrl: string;
  mine: boolean;
}

/** A conversation's messages, oldest first (the latest 300). */
export async function chatMessages(threadId: number, viewerId: number | null): Promise<ChatMessage[]> {
  const rows = await prisma.item.findMany({
    where: { ...visibleMessage(), parentId: threadId },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, text: true, createdAt: true, authorId: true, author: { select: { username: true, email: true } } },
  });
  return rows.reverse().map((m) => ({
    id: m.id,
    text: m.text ?? "",
    createdAt: m.createdAt,
    username: m.author.username,
    avatarUrl: avatarUrl(m.author.email, m.author.username),
    mine: viewerId !== null && m.authorId === viewerId,
  }));
}

export const oneLine = (text: string | null, max = 160) => {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
