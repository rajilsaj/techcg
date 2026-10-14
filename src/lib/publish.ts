import { after } from "next/server";
import { prisma } from "./db";
import { checkRateLimit } from "./ratelimit";
import { enrichStory } from "./enrich-story";
import { isPubliclyVisible, publiclyVisible } from "./content-status";
import { getSettings } from "./settings";
import { parseTagNames, setItemTags } from "./taxonomy";
import { t } from "@/i18n";

/*
 * Publishing and commenting, shared by the website's forms and the public API,
 * so both follow exactly the same rules (open submissions, rate limits,
 * duplicates, moderation).
 */

export interface Author {
  userId: number;
  isAdmin: boolean;
}

/** Why a write was refused: maps to an HTTP status in the API, to a message on the site. */
export type RefusalCode = "unauthorized" | "forbidden" | "validation" | "not_found" | "rate_limited";
export type Refusal = { ok: false; code: RefusalCode; message: string; retryAfter?: number };

const refuse = (code: RefusalCode, message: string, retryAfter?: number): Refusal => ({ ok: false, code, message, retryAfter });

export const STORY_TYPES = ["story", "ask", "show", "job"] as const;
export type StoryType = (typeof STORY_TYPES)[number];

export interface StoryInput {
  type: string;
  title: string;
  url?: string | null;
  text?: string | null;
  categoryId?: number | null;
  /** Comma-separated tag names. */
  tags?: string | null;
}

/**
 * Publishes a story, question, show or job. A link already shared in the last
 * 14 days isn't published twice: the author's upvote goes to the existing one
 * (`duplicate: true`).
 */
export async function publishStory(
  author: Author,
  input: StoryInput
): Promise<{ ok: true; itemId: number; duplicate: boolean } | Refusal> {
  const settings = await getSettings();
  if (!settings.submissionsOpen && !author.isAdmin) return refuse("forbidden", t("action.submissionsClosed"));

  const type = input.type;
  if (!(STORY_TYPES as readonly string[]).includes(type)) return refuse("validation", t("action.invalidType"));

  const title = (input.title ?? "").trim();
  if (!title) return refuse("validation", t("action.titleRequired"));
  if (title.length > 500) return refuse("validation", t("action.titleTooLong"));

  const url = (input.url ?? "").trim();
  const text = (input.text ?? "").trim();
  if (text.length > 20000) return refuse("validation", t("action.commentTooLong"));
  if (type === "story" && !url && !text) return refuse("validation", t("action.urlOrTextRequired"));
  if (url && text && type !== "ask" && type !== "show") return refuse("validation", t("action.urlOrTextNotBoth"));
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      return refuse("validation", t("action.invalidUrl"));
    }
  }

  const limit = await checkRateLimit(author.userId, "submit");
  if (!limit.allowed) return refuse("rate_limited", t("action.rateLimited", { seconds: limit.retryAfter ?? 0 }), limit.retryAfter);

  // Same link in the last 14 days: upvote the existing story instead.
  if (url) {
    const existing = await prisma.item.findFirst({
      where: { type: "story", url, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, ...publiclyVisible() },
      select: { id: true },
    });
    if (existing) {
      const voted = await prisma.vote.findUnique({ where: { userId_itemId: { userId: author.userId, itemId: existing.id } } });
      if (!voted) {
        await prisma.$transaction([
          prisma.item.update({ where: { id: existing.id }, data: { points: { increment: 1 } } }),
          prisma.vote.create({ data: { userId: author.userId, itemId: existing.id } }),
        ]);
      }
      return { ok: true, itemId: existing.id, duplicate: true };
    }
  }

  const story = await prisma.item.create({
    data: {
      type,
      title,
      url: url || null,
      text: text || null,
      authorId: author.userId,
      path: "", // set to the padded id below
      points: 1,
      categoryId: await validCategoryId(input.categoryId ?? settings.defaultCategoryId),
    },
  });
  await setItemTags(story.id, parseTagNames(input.tags));
  await prisma.item.update({ where: { id: story.id }, data: { path: String(story.id).padStart(6, "0") } });
  // Authors upvote their own story.
  await prisma.vote.create({ data: { userId: author.userId, itemId: story.id } });

  // Fetch the link's image and excerpt (translated to French) once the response is sent.
  if (url) after(() => enrichStory(story.id));

  return { ok: true, itemId: story.id, duplicate: false };
}

/** The category id if it exists, else null (a stale form must not break publishing). */
async function validCategoryId(id: number | null | undefined): Promise<number | null> {
  if (!id || !Number.isInteger(id)) return null;
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  return category?.id ?? null;
}

/**
 * Comments on a publication (a message in its discussion). Held for approval
 * when the moderation setting says so (`pending: true`).
 */
export async function postComment(
  author: Author,
  itemId: number,
  rawText: string
): Promise<{ ok: true; commentId: number; pending: boolean } | Refusal> {
  const text = (rawText ?? "").trim();
  if (!text) return refuse("validation", t("action.commentRequired"));
  if (text.length > 10000) return refuse("validation", t("action.commentTooLong"));

  const limit = await checkRateLimit(author.userId, "comment");
  if (!limit.allowed) return refuse("rate_limited", t("action.commentRateLimited", { seconds: limit.retryAfter ?? 0 }), limit.retryAfter);

  const parent = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, type: true, path: true, status: true, publishAt: true },
  });
  if (!parent || parent.type === "comment" || !isPubliclyVisible(parent)) return refuse("not_found", t("action.itemNotFound"));

  // Comment moderation setting: hold every comment, or a member's first one, for approval.
  const { commentModeration } = await getSettings();
  const held =
    !author.isAdmin &&
    (commentModeration === "all" ||
      (commentModeration === "first" &&
        (await prisma.item.count({ where: { type: "comment", authorId: author.userId, status: "published" } })) === 0));

  const comment = await prisma.item.create({
    data: {
      type: "comment",
      text,
      authorId: author.userId,
      parentId: itemId,
      path: `${parent.path}.${String(itemId).padStart(6, "0")}.${Date.now() % 1000000}`,
      depth: parent.path.split(".").length,
      points: 1,
      status: held ? "pending" : "published",
    },
    select: { id: true },
  });

  // Only visible comments count.
  if (!held) await prisma.item.update({ where: { id: itemId }, data: { commentCount: { increment: 1 } } });

  return { ok: true, commentId: comment.id, pending: held };
}
