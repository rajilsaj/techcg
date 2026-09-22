import { prisma } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-utils";
import { API_ERRORS, VoteResponse } from "@/types/api";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 400, { message: "itemId required" });
    }

    // TODO: Get userId from auth
    const userId = 1; // Placeholder

    // Check if vote already exists
    const existingVote = await prisma.vote.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existingVote) {
      // Delete vote (unvote)
      await prisma.vote.delete({
        where: { id: existingVote.id },
      });

      // Decrease points
      await prisma.item.update({
        where: { id: itemId },
        data: { points: { decrement: 1 } },
      });

      return createSuccessResponse({ voted: false });
    } else {
      // Create vote
      const vote = await prisma.vote.create({
        data: { userId, itemId },
        select: {
          id: true,
          userId: true,
          itemId: true,
          createdAt: true,
        },
      });

      // Increase points
      await prisma.item.update({
        where: { id: itemId },
        data: { points: { increment: 1 } },
      });

      const response: VoteResponse = {
        ...vote,
        createdAt: vote.createdAt.toISOString(),
      };

      return createSuccessResponse({ ...response, voted: true }, 201);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
