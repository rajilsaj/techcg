import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StoryRow } from "@/components/list/StoryRow";
import { Pagination } from "@/components/list/Pagination";
import { getT } from "@/i18n/server";
import { encodeCursor, estimatePageNumber } from "@/lib/list-pagination";

const ITEMS_PER_PAGE = 30;

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function CommentsPage({ searchParams }: PageProps) {
  const t = await getT();
  const params = await searchParams;
  const cursorParam = params.cursor;

  const comments = await prisma.item.findMany({
    where: {
      type: "comment",
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
      text: true,
      author: {
        select: {
          username: true,
        },
      },
      points: true,
      createdAt: true,
      parent: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const hasNext = comments.length > ITEMS_PER_PAGE;
  const displayComments = comments.slice(0, ITEMS_PER_PAGE);
  const nextCursor =
    hasNext && displayComments.length > 0
      ? encodeCursor({
          rankScore: 0,
          id: displayComments[displayComments.length - 1].id,
        })
      : undefined;

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto">
        <SectionHeader title={t("section.recentComments")} showSubmit={false} />

        <div>
          {displayComments.map((comment, i) => (
            <StoryRow
              key={comment.id}
              rank={i + 1}
              id={comment.id}
              title={comment.text ? comment.text.slice(0, 100) + (comment.text.length > 100 ? "…" : "") : t("common.comment")}
              author={comment.author.username}
              points={comment.points}
              commentCount={0}
              createdAt={comment.createdAt}
            />
          ))}
        </div>

        <Pagination
          currentPage={estimatePageNumber(cursorParam)}
          hasNext={hasNext}
          nextCursor={nextCursor}
          pathname="/comments"
        />
      </div>
    </>
  );
}
