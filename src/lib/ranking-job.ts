import { Prisma } from "@prisma/client";
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
  if (items.length === 0) return 0;
  const now = new Date();
  // One statement for all of them: one query per story took over a minute from Vercel.
  const rows = items.map((item) => Prisma.sql`(${item.id}::int, ${calculateRankScore(item.points, item.createdAt)}::double precision)`);
  await prisma.$executeRaw`
    UPDATE "Item" AS i SET "rankScore" = v.score, "rankedAt" = ${now}
    FROM (VALUES ${Prisma.join(rows)}) AS v(id, score)
    WHERE i.id = v.id`;
  return items.length;
}
