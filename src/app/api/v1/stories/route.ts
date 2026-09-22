import { prisma } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, validatePagination, handleApiError } from "@/lib/api-utils";
import { API_ERRORS, CreateStoryRequest, StoryResponse } from "@/types/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "30");
    const { page: p, perPage: pp } = validatePagination(page, perPage);

    const skip = (p - 1) * pp;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where: { type: "story", deleted: false, author: { shadowBanned: false } },
        orderBy: { rankScore: "desc" },
        skip,
        take: pp,
        select: {
          id: true,
          title: true,
          url: true,
          author: { select: { id: true, username: true, karma: true } },
          points: true,
          commentCount: true,
          flagCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.item.count({
        where: { type: "story", deleted: false, author: { shadowBanned: false } },
      }),
    ]);

    const stories: StoryResponse[] = items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return createPaginatedResponse(stories, total, p, pp);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication
    const body = await request.json() as CreateStoryRequest;

    if (!body.title || (!body.url && !body.text)) {
      return createErrorResponse(
        API_ERRORS.VALIDATION_ERROR,
        400,
        { message: "Title and either URL or text content required" }
      );
    }

    // TODO: Get userId from auth
    const userId = 1; // Placeholder

    const story = await prisma.item.create({
      data: {
        type: "story",
        title: body.title,
        url: body.url,
        text: body.text,
        authorId: userId,
        points: 1,
        rankScore: 0,
      },
      select: {
        id: true,
        title: true,
        url: true,
        author: { select: { id: true, username: true, karma: true } },
        points: true,
        commentCount: true,
        flagCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response: StoryResponse = {
      ...story,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    };

    return createSuccessResponse(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
