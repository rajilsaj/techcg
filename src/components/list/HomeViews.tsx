import Link from "next/link";
import { Clock, Flame, MessagesSquare, MessageSquareText } from "lucide-react";
import { filtersQuery, type StoryFilters } from "@/lib/story-filters";
import type { StoryOrder } from "@/lib/stories";
import { t, type Key } from "@/i18n";

const VIEWS: { sort: StoryOrder; icon: typeof Clock }[] = [
  { sort: "views", icon: Flame },
  { sort: "newest", icon: Clock },
  { sort: "comments", icon: MessagesSquare },
];

/**
 * Above « Congo »: Les plus populaires (most consulted), Les plus récents,
 * Les plus discutés (most comments) as one segmented control, and
 * « En discussion » leading to the conversations.
 */
export function HomeViews({ filters, liveCount }: { filters: StoryFilters; liveCount: number }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <nav aria-label={t("home.views")} className="scrollbar-none -mx-4 flex min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex shrink-0 items-center gap-1 rounded-full bg-bg-secondary p-1">
          {VIEWS.map(({ sort, icon: Icon }) => {
            const on = filters.sort === sort;
            const query = filtersQuery(filters, { sort }).toString();
            return (
              <li key={sort}>
                <Link
                  href={query ? `/?${query}` : "/"}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  title={t(`home.view.${sort}Hint` as Key)}
                  className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm sm:px-3.5 font-semibold transition-colors hover:no-underline ${
                    on ? "bg-text text-bg shadow-sm" : "text-text-secondary hover:bg-bg hover:text-text"
                  }`}
                >
                  <Icon size={15} aria-hidden className="hidden sm:block" />
                  <span className="hidden sm:inline">{t(`home.view.${sort}` as Key)}</span>
                  <span className="sm:hidden">{t(`home.view.${sort}Short` as Key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href="/discussions"
        className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border px-3 sm:px-4 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent hover:no-underline"
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          {liveCount > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${liveCount > 0 ? "bg-emerald-500" : "bg-text-secondary/40"}`} />
        </span>
        <MessageSquareText size={16} aria-hidden className="sm:hidden" />
        <span className="sr-only sm:not-sr-only">{t("home.inDiscussion")}</span>
        {liveCount > 0 && <span className="rounded-full bg-bg-secondary px-1.5 text-xs tabular-nums text-text-secondary group-hover:text-accent">{liveCount}</span>}
      </Link>
    </div>
  );
}
