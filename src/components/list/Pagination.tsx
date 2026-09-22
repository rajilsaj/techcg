import Link from "next/link";
import { getT } from "@/i18n/server";

export interface PaginationProps {
  currentPage: number;
  hasNext: boolean;
  nextCursor?: string;
  prevCursor?: string;
  pathname: string;
}

export async function Pagination({
  currentPage,
  hasNext,
  nextCursor,
  prevCursor,
  pathname,
}: PaginationProps) {
  const t = await getT();

  const buildUrl = (cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="border-t border-border px-4 py-4 flex items-center justify-between">
      <div className="text-sm text-text-secondary">
        {t("pagination.page", { page: currentPage })}
      </div>

      <div className="flex gap-2">
        {prevCursor && currentPage > 1 && (
          <Link
            href={buildUrl(prevCursor)}
            className="px-3 py-1.5 border border-border rounded hover:border-accent hover:text-accent transition-colors text-sm"
          >
            {t("pagination.prev")}
          </Link>
        )}

        {hasNext && nextCursor && (
          <Link
            href={buildUrl(nextCursor)}
            className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10 transition-colors text-sm"
          >
            {t("pagination.next")}
          </Link>
        )}
      </div>
    </div>
  );
}
