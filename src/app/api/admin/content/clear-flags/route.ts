import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // TODO: Replace with OAuth verification
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing itemId" },
        { status: 400 }
      );
    }

    await prisma.item.update({
      where: { id: itemId },
      data: { flagCount: 0 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear flags error:", error);
    return NextResponse.json(
      { error: "Failed to clear flags" },
      { status: 500 }
    );
  }
}
