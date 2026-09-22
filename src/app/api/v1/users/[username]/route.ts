import { prisma } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-utils";
import { API_ERRORS, UserDetailResponse } from "@/types/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        about: true,
        karma: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });

    if (!user) {
      return createErrorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const response: UserDetailResponse = {
      id: user.id,
      username: user.username,
      about: user.about || undefined,
      karma: user.karma,
      createdAt: user.createdAt.toISOString(),
      itemCount: user._count.items,
      commentCount: 0, // TODO: Count comments
    };

    return createSuccessResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
