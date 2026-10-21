import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { importOnVisit } from "@/lib/importer/schedule";
import { listStories, STORIES_PER_PAGE } from "@/lib/stories";
import { DEFAULT_SORT, filtersQuery, filtersRecord, filtersWhere, hasFilters, HOME_STORIES, parseStoryFilters } from "@/lib/story-filters";
import { Header } from "@/components/layout/Header";
import { InfiniteStoryList } from "@/components/list/InfiniteStoryList";
import { StoryFilterBar } from "@/components/list/StoryFilterBar";
import { RegionSection, SectionTitle } from "@/components/list/RegionSection";
import { HomeViews } from "@/components/list/HomeViews";
import { liveDiscussionCount } from "@/lib/discussions";
import { latestHomeStoryId } from "@/lib/home-latest";
import { NewStoriesNotice } from "@/components/list/NewStoriesNotice";
import { nextPageHref, pageNumber } from "@/components/list/StoryList";
import { t } from "@/i18n";

/** Stories in each leading section (Congo, then Africa). */
const SECTION_COUNT = 5;

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

  // Unfiltered homepage: 5 Congo stories, then 5 from the rest of Africa (in the chosen order),
  // then everything else ("D'ailleurs"), which leaves those 10 out on every page.
  const lead = async (region: string, exclude: number[]) =>
    hasFilters(filters)
      ? []
      : (
          await listStories({
            where: { AND: [HOME_STORIES, { id: { notIn: exclude } }, { tags: { some: { tag: { slug: region } } } }] },
            // Les plus populaires / récents / discutés (the tabs above « Congo »).
            order: filters.sort,
            take: SECTION_COUNT,
            viewerId: session?.userId,
          })
        ).stories;
  // A story has one region tag, so the two sections can be fetched together.
  const [congo, africa, live, latestId] = await Promise.all([lead("congo", []), lead("afrique", []), liveDiscussionCount(), latestHomeStoryId()]);
  const leadIds = [...congo, ...africa].map((story) => story.id);
  const leading = leadIds.length > 0 && !params.cursor;

  const { stories, nextCursor } = await listStories({
    where: { AND: [HOME_STORIES, filtersWhere(filters), leadIds.length ? { id: { notIn: leadIds } } : {}] },
    order: filters.sort,
    cursor: params.cursor,
    viewerId: session?.userId,
  });

  const query = filtersQuery(filters).toString();
  const newestQuery = filtersQuery(filters, { sort: DEFAULT_SORT }).toString();
  const fallback = nextPageHref("/", nextCursor, page);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <StoryFilterBar filters={filters} />
        <HomeViews filters={filters} liveCount={live} />
        {/* New stories (cron imports, members' posts) announced without a reload, on the first page of the unfiltered list. */}
        {!hasFilters(filters) && !params.cursor && (
          <NewStoriesNotice latestId={latestId} sortIsNewest={filters.sort === DEFAULT_SORT} newestHref={newestQuery ? `/?${newestQuery}` : "/"} />
        )}
        {leading && (
          <>
            <RegionSection
              id="news-congo"
              title={t("home.congo")}
              moreHref="/etiquette/congo"
              moreLabel={t("home.congoAll")}
              stories={congo}
              firstRank={1}
              isLoggedIn={!!session}
              highlightLatest
            />
            <RegionSection
              id="news-africa"
              title={t("home.africa")}
              moreHref="/etiquette/afrique"
              moreLabel={t("home.africaAll")}
              stories={africa}
              firstRank={congo.length + 1}
              isLoggedIn={!!session}
            />
            <div className="mt-10">
              <SectionTitle id="news-world">
                {t("home.world")}
              </SectionTitle>
            </div>
          </>
        )}
        <InfiniteStoryList
          // A new search starts a fresh list, and so do newly arrived stories (« N nouveaux articles »).
          key={`${query}:${latestId}`}
          feed="top"
          initialStories={stories}
          initialCursor={nextCursor}
          isLoggedIn={!!session}
          // Numbering continues after the Congo and Africa sections.
          firstRank={(page - 1) * STORIES_PER_PAGE + 1 + (params.cursor ? 0 : leadIds.length)}
          fallbackHref={fallback && query ? `${fallback}&${query}` : fallback}
          filters={filtersRecord(filters)}
          excludeIds={leadIds}
          emptyMessage={hasFilters(filters) ? t("filters.noResults") : undefined}
        />
      </div>
    </>
  );
}
