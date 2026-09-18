import { prisma } from "@/lib/db";
import { calculateRankScore } from "@/lib/ranking";

async function rankItems() {
  console.log("Starting ranking sweep...");

  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find all items that need ranking (stories from last 48h or anything with recent votes)
  const items = await prisma.item.findMany({
    where: {
      type: "story",
      createdAt: {
        gte: fortyEightHoursAgo,
      },
      deleted: false,
    },
    select: {
      id: true,
      points: true,
      createdAt: true,
    },
  });

  console.log(`Found ${items.length} items to rank`);

  let updated = 0;
  for (const item of items) {
    const rankScore = calculateRankScore(item.points, item.createdAt);

    await prisma.item.update({
      where: { id: item.id },
      data: {
        rankScore,
        rankedAt: new Date(),
      },
    });

    updated++;
  }

  console.log(`Updated ${updated} items`);
  console.log("Ranking sweep complete!");
}

rankItems()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
