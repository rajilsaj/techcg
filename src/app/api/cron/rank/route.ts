import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateRankScore } from "@/lib/ranking";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  // Verify secret
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Find all items that need ranking (stories from last 48h, or anything with recent votes)
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

    console.log(`[rank] Found ${items.length} items to rank`);

    // Update rank scores
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

    // Revalidate cache tags to refresh pages
    revalidateTag("stories");
    revalidateTag("stories-top");

    return NextResponse.json({
      success: true,
      updated,
      message: `Updated ${updated} items`,
    });
  } catch (error) {
    console.error("[rank] Error:", error);
    return NextResponse.json(
      { error: "Failed to rank items" },
      { status: 500 }
    );
  }
}
