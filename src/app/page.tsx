import { getSession } from "@/lib/auth";
import { listStories, STORIES_PER_PAGE } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/home/Hero";
import { InfiniteStoryList } from "@/components/list/InfiniteStoryList";
import { nextPageHref, pageNumber } from "@/components/list/StoryList";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  const page = pageNumber(params.page);

  const { stories, nextCursor } = await listStories({
    where: { type: "story" },
    order: "rank",
    cursor: params.cursor,
    viewerId: session?.userId,
  });

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <Hero active="new" />
        <InfiniteStoryList
          feed="top"
          initialStories={stories}
          initialCursor={nextCursor}
          isLoggedIn={!!session}
          firstRank={(page - 1) * STORIES_PER_PAGE + 1}
          fallbackHref={nextPageHref("/", nextCursor, page)}
        />
      </div>
    </>
  );
}
