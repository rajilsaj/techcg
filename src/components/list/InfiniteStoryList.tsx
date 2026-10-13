"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadMoreStoriesAction, type Feed } from "@/app/api/actions/stories";
import type { ListedStory } from "@/lib/stories";
import { t } from "@/i18n";
import { StoryItem } from "./StoryItem";
import { CircleCheck } from "lucide-react";

export interface InfiniteStoryListProps {
  feed: Feed;
  initialStories: ListedStory[];
  initialCursor?: string;
  isLoggedIn: boolean;
  /** Plain link to the next page, kept for crawlers and visitors without JavaScript. */
  fallbackHref?: string;
  /** Rank of the first story, when the page was opened past page 1. */
  firstRank?: number;
  /** The page's search filters (URL parameters), applied to the next pages too. */
  filters?: Record<string, string>;
  /** Shown instead of the default when there's nothing to list. */
  emptyMessage?: string;
}

/** Story list that loads the next page when its end scrolls into view. */
export function InfiniteStoryList({
  feed,
  initialStories,
  initialCursor,
  isLoggedIn,
  fallbackHref,
  firstRank = 1,
  filters,
  emptyMessage,
}: InfiniteStoryListProps) {
  const [stories, setStories] = useState(initialStories);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading.current) return;
    loading.current = true;
    setStatus("loading");
    try {
      const page = await loadMoreStoriesAction(feed, cursor, filters);
      // Rankings can shift between loads; never show a story twice.
      setStories((current) => {
        const seen = new Set(current.map((s) => s.id));
        return [...current, ...page.stories.filter((s) => !seen.has(s.id))];
      });
      setCursor(page.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      loading.current = false;
    }
  }, [feed, cursor, filters]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || status === "error") return;
    // Start loading a little before the end is visible.
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "600px 0px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, status, loadMore]);

  if (stories.length === 0) {
    return <p className="py-12 text-center text-sm text-text-secondary">{emptyMessage ?? t("story.empty")}</p>;
  }

  return (
    <>
      <ol>
        {stories.map((story, i) => (
          <StoryItem key={story.id} rank={firstRank + i} story={story} isLoggedIn={isLoggedIn} />
        ))}
      </ol>

      <div ref={sentinel} className="flex justify-center py-8 text-sm text-text-secondary" aria-live="polite">
        {status === "loading" && (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden />
            {t("feed.loading")}
          </span>
        )}
        {status === "error" && (
          <button type="button" onClick={loadMore} className="font-medium text-accent hover:underline">
            {t("feed.retry")}
          </button>
        )}
        {status === "idle" && !cursor && (
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck size={16} className="text-accent" aria-hidden />
            {t("feed.end")}
          </span>
        )}
        {status === "idle" && cursor && fallbackHref && (
          <noscript>
            <a href={fallbackHref} className="text-accent">
              {t("pagination.next")}
            </a>
          </noscript>
        )}
      </div>
    </>
  );
}
