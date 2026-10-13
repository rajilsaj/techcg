import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { importOnVisit } from "@/lib/importer/schedule";
import { listStories, STORIES_PER_PAGE } from "@/lib/stories";
import { filtersQuery, filtersRecord, filtersWhere, hasFilters, parseStoryFilters } from "@/lib/story-filters";
import { Header } from "@/components/layout/Header";
import { InfiniteStoryList } from "@/components/list/InfiniteStoryList";
import { StoryFilterBar } from "@/components/list/StoryFilterBar";
import { nextPageHref, pageNumber } from "@/components/list/StoryList";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseStoryFilters(params);
  const session = await getSession();
  const page = pageNumber(params.page);

  // Fetch new articles from due sources once the page has been sent (at most one source per visit).
  after(importOnVisit);

  const { stories, nextCursor } = await listStories({
    where: { AND: [{ type: "story" }, filtersWhere(filters)] },
    order: filters.sort,
    cursor: params.cursor,
    viewerId: session?.userId,
  });

  const query = filtersQuery(filters).toString();
  const fallback = nextPageHref("/", nextCursor, page);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <StoryFilterBar filters={filters} />
        <InfiniteStoryList
          // A new search starts a fresh list.
          key={query}
          feed="top"
          initialStories={stories}
          initialCursor={nextCursor}
          isLoggedIn={!!session}
          firstRank={(page - 1) * STORIES_PER_PAGE + 1}
          fallbackHref={fallback && query ? `${fallback}&${query}` : fallback}
          filters={filtersRecord(filters)}
          emptyMessage={hasFilters(filters) ? t("filters.noResults") : undefined}
        />
      </div>
    </>
  );
}
