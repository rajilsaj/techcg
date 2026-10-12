import { getSession } from "@/lib/auth";
import { listStories } from "@/lib/stories";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/home/Hero";
import { StoryList, nextPageHref, pageNumber } from "@/components/list/StoryList";

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
        <StoryList
          stories={stories}
          isLoggedIn={!!session}
          page={page}
          nextHref={nextPageHref("/", nextCursor, page)}
        />
      </div>
    </>
  );
}
