"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function submitCommentAction(
  itemId: number,
  text: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();

  if (!session) {
    return { error: "Vous devez être connecté" };
  }

  if (!text || !text.trim()) {
    return { error: "Le commentaire ne peut pas être vide" };
  }

  if (text.length > 10000) {
    return { error: "Commentaire trop long (10 000 caractères maximum)" };
  }

  // Check if parent item exists
  const parent = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      path: true,
      commentCount: true,
    },
  });

  if (!parent) {
    return { error: "Élément introuvable" };
  }

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
    },
  });

  // Increment parent's commentCount
  await prisma.item.update({
    where: { id: itemId },
    data: {
      commentCount: parent.commentCount + 1,
    },
  });

  // Revalidate cache
  // revalidateTag(`item-${itemId}`);
  // revalidateTag("stories");

  return { success: true };
}
