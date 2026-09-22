import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, ApiError, API_ERRORS } from "@/types/api";

export function createSuccessResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createErrorResponse(
  error: ApiError,
  status = 400,
  details?: Record<string, any>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
  status = 200
) {
  const hasNext = page * perPage < total;
  const hasPrev = page > 1;

  return NextResponse.json(
    {
      success: true,
      data: {
        items,
        total,
        page,
        perPage,
        hasNext,
        hasPrev,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function validateRequired(obj: Record<string, any>, ...fields: string[]) {
  const missing = fields.filter((field) => !obj[field]);
  if (missing.length > 0) {
    throw {
      error: API_ERRORS.VALIDATION_ERROR,
      details: { missing },
      status: 400,
    };
  }
}

export function validatePagination(page?: number, perPage?: number) {
  const p = page || 1;
  const pp = Math.min(perPage || 30, 100); // Max 100 per page

  if (p < 1) {
    throw {
      error: API_ERRORS.BAD_REQUEST,
      details: { message: "Page must be >= 1" },
      status: 400,
    };
  }

  return { page: p, perPage: pp };
}

export async function handleApiError(error: any) {
  if (error.error) {
    return createErrorResponse(error.error, error.status || 400, error.details);
  }

  console.error("Unexpected error:", error);
  return createErrorResponse(API_ERRORS.INTERNAL_ERROR, 500);
}
