"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { t } from "@/i18n";

/** Hides (or un-hides) a story from the current user's lists. */
export async function setHiddenAction(
  itemId: number,
  hidden: boolean
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session) {
    return { error: t("action.notAuthenticated") };
  }

  if (hidden) {
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) {
      return { error: t("action.itemNotFound") };
    }
    await prisma.hiddenItem.upsert({
      where: { userId_itemId: { userId: session.userId, itemId } },
      create: { userId: session.userId, itemId },
      update: {},
    });
  } else {
    await prisma.hiddenItem.deleteMany({ where: { userId: session.userId, itemId } });
  }

  return { success: true };
}
