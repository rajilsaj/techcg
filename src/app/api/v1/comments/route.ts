import { prisma } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, validatePagination, handleApiError } from "@/lib/api-utils";
import { API_ERRORS, CreateCommentRequest, CommentResponse } from "@/types/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "30");

    if (!itemId) {
      return createErrorResponse(API_ERRORS.BAD_REQUEST, 400, { message: "itemId required" });
    }

    const { page: p, perPage: pp } = validatePagination(page, perPage);
    const skip = (p - 1) * pp;

    const [comments, total] = await Promise.all([
      prisma.item.findMany({
        where: { type: "comment", parentId: parseInt(itemId), deleted: false },
        orderBy: { points: "desc" },
        skip,
        take: pp,
        select: {
          id: true,
          text: true,
          author: { select: { id: true, username: true, karma: true } },
          parentId: true,
          points: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.item.count({
        where: { type: "comment", parentId: parseInt(itemId), deleted: false },
      }),
    ]);

    const result: CommentResponse[] = comments.map((comment) => ({
      ...comment,
      text: comment.text || "",
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    return createPaginatedResponse(result, total, p, pp);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication
    const body = await request.json() as CreateCommentRequest;

    if (!body.text || !body.parentId) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 400, { message: "text and parentId required" });
    }

    // TODO: Get userId from auth
    const userId = 1; // Placeholder

    const comment = await prisma.item.create({
      data: {
        type: "comment",
        text: body.text,
        parentId: body.parentId,
        authorId: userId,
        points: 1,
        rankScore: 0,
      },
      select: {
        id: true,
        text: true,
        author: { select: { id: true, username: true, karma: true } },
        parentId: true,
        points: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response: CommentResponse = {
      ...comment,
      text: comment.text || "",
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };

    return createSuccessResponse(response, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
