import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryRow } from "@/components/list/StoryRow";
import { Pagination } from "@/components/list/Pagination";
import { encodeCursor, estimatePageNumber } from "@/lib/list-pagination";

const ITEMS_PER_PAGE = 30;

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function AskPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cursorParam = params.cursor;

  const stories = await prisma.item.findMany({
    where: {
      type: "ask",
      deleted: false,
      author: {
        shadowBanned: false,
      },
    },
    orderBy: {
      rankScore: "desc",
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
          rankScore: 0,
          id: displayStories[displayStories.length - 1].id,
        })
      : undefined;

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto">
        <SectionHeader title="Questions" />

        <div>
          {displayStories.map((story, i) => (
            <StoryRow
              key={story.id}
              rank={i + 1}
              id={story.id}
              title={story.title || "Sans titre"}
              url={story.url || undefined}
              author={story.author.username}
              points={story.points}
              commentCount={story.commentCount}
              createdAt={story.createdAt}
            />
          ))}
        </div>

        <Pagination
          currentPage={estimatePageNumber(cursorParam)}
          hasNext={hasNext}
          nextCursor={nextCursor}
          pathname="/ask"
        />
      </div>
    </>
  );
}
