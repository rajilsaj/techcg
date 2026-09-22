import { prisma } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-utils";
import { API_ERRORS, StoryResponse, UpdateStoryRequest } from "@/types/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const story = await prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        text: true,
        author: { select: { id: true, username: true, karma: true } },
        points: true,
        commentCount: true,
        flagCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!story) {
      return createErrorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const response: StoryResponse = {
      ...story,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    };

    return createSuccessResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication and ownership check
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json() as UpdateStoryRequest;

    const story = await prisma.item.findUnique({ where: { id } });
    if (!story) {
      return createErrorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.url && { url: body.url }),
        ...(body.text && { text: body.text }),
      },
      select: {
        id: true,
        title: true,
        url: true,
        text: true,
        author: { select: { id: true, username: true, karma: true } },
        points: true,
        commentCount: true,
        flagCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response: StoryResponse = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return createSuccessResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // TODO: Add authentication and admin check
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const story = await prisma.item.findUnique({ where: { id } });
    if (!story) {
      return createErrorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    await prisma.item.update({
      where: { id },
      data: { deleted: true },
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
