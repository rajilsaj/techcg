"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function toggleVoteAction(itemId: number): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();

  if (!session) {
    return { error: "Vous devez être connecté" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      createdAt: true,
      karma: true,
    },
  });

  if (!user) {
    return { error: "Utilisateur introuvable" };
  }

  // Check if account is old enough (24h) and has karma
  const accountAge = Date.now() - user.createdAt.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (accountAge < twentyFourHours && user.karma === 0) {
    return { error: "Les nouveaux comptes doivent attendre 24 heures avant de voter" };
  }

  // Check if item exists
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, points: true },
  });

  if (!item) {
    return { error: "Élément introuvable" };
  }

  // Check if user already voted
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_itemId: {
        userId: session.userId,
        itemId,
      },
    },
  });

  if (existingVote) {
    // Remove vote
    await prisma.vote.delete({
      where: {
        id: existingVote.id,
      },
    });

    // Decrement points
    await prisma.item.update({
      where: { id: itemId },
      data: {
        points: Math.max(1, item.points - 1),
      },
    });
  } else {
    // Add vote
    await prisma.vote.create({
      data: {
        userId: session.userId,
        itemId,
      },
    });

    // Increment points
    await prisma.item.update({
      where: { id: itemId },
      data: {
        points: item.points + 1,
      },
    });
  }

  // Revalidate cache
  // revalidateTag("stories");
  // revalidateTag(`item-${itemId}`);

  return { success: true };
}
