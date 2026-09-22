import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryRow } from "@/components/list/StoryRow";
import { Pagination } from "@/components/list/Pagination";
import { getT } from "@/i18n/server";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 30;

export default async function Home() {
  const t = await getT();
  // Fetch top stories by rankScore (exclude deleted and shadowbanned authors)
  const stories = await prisma.item.findMany({
    where: {
      type: "story",
      deleted: false,
      author: {
        shadowBanned: false,
      },
    },
    orderBy: {
      rankScore: "desc",
    },
    take: ITEMS_PER_PAGE + 1, // +1 to check if there are more
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
      rankScore: true,
    },
  });

  const hasNext = stories.length > ITEMS_PER_PAGE;
  const displayStories = stories.slice(0, ITEMS_PER_PAGE);
  const nextCursor =
    hasNext && displayStories.length > 0
      ? Buffer.from(
          JSON.stringify({
            rankScore: displayStories[displayStories.length - 1]?.rankScore,
            id: displayStories[displayStories.length - 1]?.id,
          })
        ).toString("base64")
      : undefined;

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={t("section.top")} />

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
          currentPage={1}
          hasNext={hasNext}
          nextCursor={nextCursor}
          pathname="/"
        />
      </div>
    </>
  );
}
