import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { adminApiError } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const denied = await adminApiError();
  if (denied) return denied;

  try {
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
