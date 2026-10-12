import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const denied = await adminApiError();
  if (denied) return denied;

  try {
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
