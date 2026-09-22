import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // TODO: Replace with OAuth verification
    // For now, this endpoint is open (will be protected by OAuth later)
    const { userId, shadowBan } = await request.json();

    if (!userId || shadowBan === undefined) {
      return NextResponse.json(
        { error: "Missing userId or shadowBan" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { shadowBanned: shadowBan },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shadow ban error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
