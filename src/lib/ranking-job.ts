import { prisma } from "./db";
import { calculateRankScore } from "./ranking";
import { publiclyVisible } from "./content-status";

/** Recomputes the popularity score of the last 48 hours of stories. Returns how many were updated. */
export async function refreshRankScores(): Promise<number> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const items = await prisma.item.findMany({
    where: { type: "story", createdAt: { gte: since }, ...publiclyVisible() },
    select: { id: true, points: true, createdAt: true },
  });
  const now = new Date();
  for (const item of items) {
    await prisma.item.update({
      where: { id: item.id },
      data: { rankScore: calculateRankScore(item.points, item.createdAt), rankedAt: now },
    });
  }
  return items.length;
}
