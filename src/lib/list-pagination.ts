/**
 * Keyset pagination helpers for efficient deep pagination.
 * Cursor is base64-encoded JSON: { rankScore: number, id: number }
 */

export interface PageCursor {
  rankScore: number;
  id: number;
}

export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export function decodeCursor(encoded: string): PageCursor | null {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  hasNext: boolean;
  nextCursor?: string;
  prevCursor?: string;
  currentPage: number;
}

/**
 * Calculate page number based on cursor position.
 * In keyset pagination, we don't have a true "page number" but we estimate based on pageSize.
 * For simplicity, we track this client-side with the UI.
 */
export function estimatePageNumber(cursor: string | undefined): number {
  return cursor ? 2 : 1;
}
