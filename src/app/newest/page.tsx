import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryRow } from "@/components/list/StoryRow";
import { Pagination } from "@/components/list/Pagination";
import { getT } from "@/i18n/server";
import { decodeCursor, encodeCursor, estimatePageNumber } from "@/lib/list-pagination";

const ITEMS_PER_PAGE = 30;

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function NewestPage({ searchParams }: PageProps) {
  const t = await getT();
  const params = await searchParams;
  const cursorParam = params.cursor;
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;

  // Fetch stories sorted by creation time (newest first, exclude shadowbanned)
  const stories = await prisma.item.findMany({
    where: {
      type: "story",
      deleted: false,
      author: {
        shadowBanned: false,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: ITEMS_PER_PAGE + 1,
    select: {
      id: true,
      title: true,
      url: true,
      author: {
        select: {
          username: true,
        },
      },
      points: true,
      commentCount: true,
      createdAt: true,
    },
  });

  const hasNext = stories.length > ITEMS_PER_PAGE;
  const displayStories = stories.slice(0, ITEMS_PER_PAGE);
  const nextCursor =
    hasNext && displayStories.length > 0
      ? encodeCursor({
          rankScore: 0, // Not used for newest sort, but required by cursor type
          id: displayStories[displayStories.length - 1].id,
        })
      : undefined;

  const currentPage = estimatePageNumber(cursorParam);

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={t("section.newest")} />

        <div>
          {displayStories.map((story, i) => (
            <StoryRow
              key={story.id}
              rank={i + 1}
              id={story.id}
              title={story.title || t("common.untitled")}
              url={story.url || undefined}
              author={story.author.username}
              points={story.points}
              commentCount={story.commentCount}
              createdAt={story.createdAt}
            />
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          hasNext={hasNext}
          nextCursor={nextCursor}
          pathname="/newest"
        />
      </div>
    </>
  );
}
