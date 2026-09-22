"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { revalidateTag } from "next/cache";

export async function submitStoryAction(
  type: string,
  title: string,
  url: string,
  text: string
): Promise<{ error?: string; success?: boolean; itemId?: number }> {
  const session = await getSession();

  if (!session) {
    return { error: "Vous devez être connecté" };
  }

  // Validate type
  if (!["story", "ask", "show", "job"].includes(type)) {
    return { error: "Type invalide" };
  }

  // Validate title
  if (!title || !title.trim()) {
    return { error: "Le titre est requis" };
  }

  if (title.length > 500) {
    return { error: "Titre trop long (500 caractères maximum)" };
  }

  // Validate URL vs text
  const hasUrl = url && url.trim();
  const hasText = text && text.trim();

  if (type === "story" && !hasUrl && !hasText) {
    return { error: "Une URL ou un texte est requis" };
  }

  if (hasUrl && hasText && type !== "ask" && type !== "show") {
    return { error: "Indiquez une URL ou un texte, pas les deux" };
  }

  // Validate URL format if provided
  if (hasUrl) {
    try {
      new URL(url);
    } catch {
      return { error: "URL invalide" };
    }
  }

  // Check rate limit
  const rateLimitResult = await checkRateLimit(session.userId, "submit");
  if (!rateLimitResult.allowed) {
    return {
      error: `Trop de publications. Réessayez dans ${rateLimitResult.retryAfter} secondes`,
    };
  }

  // Check for duplicate URL (last 14 days)
  if (hasUrl) {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const existing = await prisma.item.findFirst({
      where: {
        type: "story",
        url: url.trim(),
        createdAt: {
          gte: twoWeeksAgo,
        },
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      // Redirect to existing story and upvote it
      const userVote = await prisma.vote.findUnique({
        where: {
          userId_itemId: {
            userId: session.userId,
            itemId: existing.id,
          },
        },
      });

      if (!userVote) {
        const story = await prisma.item.findUnique({
          where: { id: existing.id },
          select: { points: true },
        });

        if (story) {
          await prisma.item.update({
            where: { id: existing.id },
            data: { points: story.points + 1 },
          });

          await prisma.vote.create({
            data: {
              userId: session.userId,
              itemId: existing.id,
            },
          });
        }
      }

      return { success: true, itemId: existing.id };
    }
  }

  // Create story
  const story = await prisma.item.create({
    data: {
      type: type as any,
      title: title.trim(),
      url: hasUrl ? url.trim() : null,
      text: hasText ? text.trim() : null,
      authorId: session.userId,
      path: "", // Will be set to item ID padded
      points: 1,
    },
  });

  // Update path to use story ID
  const path = String(story.id).padStart(6, "0");
  await prisma.item.update({
    where: { id: story.id },
    data: { path },
  });

  // Auto-upvote own story
  await prisma.vote.create({
    data: {
      userId: session.userId,
      itemId: story.id,
    },
  });

  // Revalidate cache
  // revalidateTag("stories");

  return { success: true, itemId: story.id };
}
