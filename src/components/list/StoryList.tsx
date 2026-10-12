import Link from "next/link";
import type { ListedStory } from "@/lib/stories";
import { STORIES_PER_PAGE } from "@/lib/stories";
import { t } from "@/i18n";
import { StoryItem } from "./StoryItem";

export interface StoryListProps {
  stories: ListedStory[];
  isLoggedIn: boolean;
  /** 1-based page number, used for ranks and the "Page N" label. */
  page?: number;
  /** Link to the next page, when there is one. */
  nextHref?: string;
  emptyText?: string;
}

export function StoryList({ stories, isLoggedIn, page = 1, nextHref, emptyText }: StoryListProps) {
  if (stories.length === 0) {
    return <p className="py-12 text-center text-sm text-text-secondary">{emptyText ?? t("story.empty")}</p>;
  }

  const offset = (page - 1) * STORIES_PER_PAGE;
  return (
    <>
      <ol>
        {stories.map((story, i) => (
          <StoryItem key={story.id} rank={offset + i + 1} story={story} isLoggedIn={isLoggedIn} />
        ))}
      </ol>
      {(page > 1 || nextHref) && (
        <nav className="flex items-center justify-between py-6 text-sm">
          <span className="text-text-secondary">{t("pagination.page", { page })}</span>
          {nextHref && (
            <Link
              href={nextHref}
              className="rounded-full border border-accent px-4 py-1.5 font-medium text-accent transition-colors hover:bg-accent hover:text-white"
            >
              {t("pagination.next")}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

/** `?cursor=…&page=…` link to the next page of a list. */
export function nextPageHref(pathname: string, nextCursor: string | undefined, page: number): string | undefined {
  if (!nextCursor) return undefined;
  return `${pathname}?${new URLSearchParams({ cursor: nextCursor, page: String(page + 1) })}`;
}

/** Page number from `?page=`, defaulting to 1. */
export function pageNumber(value: string | undefined): number {
  const page = parseInt(value ?? "", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
