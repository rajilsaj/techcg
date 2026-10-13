import { NextRequest, NextResponse } from "next/server";
import { refreshRankScores } from "@/lib/ranking-job";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updated = await refreshRankScores();
    return NextResponse.json({ success: true, updated, message: `Updated ${updated} items` });
  } catch (error) {
    console.error("[rank] Error:", error);
    return NextResponse.json({ error: "Failed to rank items" }, { status: 500 });
  }
}
