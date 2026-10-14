"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isPubliclyVisible } from "@/lib/content-status";
import { getSettings } from "@/lib/settings";
import { checkRateLimit } from "@/lib/ratelimit";
import { t } from "@/i18n";

export async function submitCommentAction(
  itemId: number,
  text: string
): Promise<{ error?: string; success?: boolean; pending?: boolean }> {
  const session = await getSession();

  if (!session) {
    return { error: t("action.notAuthenticated") };
  }

  if (!text || !text.trim()) {
    return { error: t("action.commentRequired") };
  }

  if (text.length > 10000) {
    return { error: t("action.commentTooLong") };
  }

  const limit = await checkRateLimit(session.userId, "comment");
  if (!limit.allowed) {
    return { error: t("action.commentRateLimited", { seconds: limit.retryAfter ?? 0 }) };
  }

  // Check if parent item exists
  const parent = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      type: true,
      path: true,
      status: true,
      publishAt: true,
    },
  });

  if (!parent || parent.type === "comment" || !isPubliclyVisible(parent)) {
    return { error: t("action.itemNotFound") };
  }

  // Comment moderation setting: hold every comment, or a member's first one, for approval.
  const { commentModeration } = await getSettings();
  const held =
    !session.isAdmin &&
    (commentModeration === "all" ||
      (commentModeration === "first" &&
        (await prisma.item.count({ where: { type: "comment", authorId: session.userId, status: "published" } })) === 0));

  // Create comment
  const parentPath = parent.path;
  const newPath = `${parentPath}.${String(itemId).padStart(6, "0")}.${Date.now() % 1000000}`;

  const comment = await prisma.item.create({
    data: {
      type: "comment",
      text: text.trim(),
      authorId: session.userId,
      parentId: itemId,
      path: newPath,
      depth: parent.path.split(".").length,
      points: 1,
      status: held ? "pending" : "published",
    },
  });

  // Only visible comments count.
  if (!held) {
    await prisma.item.update({ where: { id: itemId }, data: { commentCount: { increment: 1 } } });
  }

  revalidatePath(`/publication/${itemId}`);
  revalidatePath(`/discussions/${itemId}`);
  return { success: true, pending: held };
}
