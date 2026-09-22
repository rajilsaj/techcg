"use server";

import { prisma } from "@/lib/db";
import { getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const FLAG_THRESHOLD = 5; // Auto-hide after 5 flags

export async function flagItemAction(itemId: number): Promise<{ error?: string; success?: boolean }> {
  const t = await getT();
  const session = await getSession();

  if (!session) {
    return { error: t("action.notAuthenticated") };
  }

  // Can only flag if karma > 0
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { karma: true },
  });

  if (!user || user.karma === 0) {
    return { error: t("action.insufficientKarma") };
  }

  // Check if item exists
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      flagCount: true,
      authorId: true,
    },
  });

  if (!item) {
    return { error: t("action.itemNotFound") };
  }

  // Can't flag own items
  if (item.authorId === session.userId) {
    return { error: t("action.cannotFlagOwn") };
  }

  // Increment flag count
  const newFlagCount = item.flagCount + 1;

  await prisma.item.update({
    where: { id: itemId },
    data: {
      flagCount: newFlagCount,
    },
  });

  // Auto-hide if threshold reached
  if (newFlagCount >= FLAG_THRESHOLD) {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        deleted: true,
      },
    });
  }

  // Revalidate cache
  // revalidateTag("stories");
  // revalidateTag(`item-${itemId}`);

  return { success: true };
}
