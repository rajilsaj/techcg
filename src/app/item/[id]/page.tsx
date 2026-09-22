import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { getDomain } from "@/lib/utils";
import { formatRelativeTime, pluralize } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { CommentThread } from "@/components/item/CommentThread";
import { CommentForm } from "@/components/item/CommentForm";
import { buildCommentTree, CommentData } from "@/lib/thread";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  // Get session
  const session = await getSession();
  const [t, locale] = await Promise.all([getT(), getLocale()]);

  // Fetch story
  const story = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      text: true,
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

  if (!story || story.type !== "story") {
    notFound();
  }

  // Fetch all comments for this story
  const commentRows = await prisma.item.findMany({
    where: {
      parentId: itemId,
      type: "comment",
      deleted: false,
    },
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
      depth: true,
      path: true,
    },
    orderBy: {
      path: "asc",
    },
  });

  // Convert rows to tree
  const commentData: CommentData[] = commentRows.map((row) => ({
    id: row.id,
    text: row.text,
    authorUsername: row.author.username,
    points: row.points,
    createdAt: row.createdAt,
    depth: row.depth,
    path: row.path,
  }));

  const commentTree = buildCommentTree(commentData);

  const domain = story.url ? getDomain(story.url) : null;

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto">
        {/* Story metadata */}
        <div className="border-b border-border p-4">
          <h1 className="text-2xl font-bold text-text mb-2">
            {story.url ? (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text hover:underline"
              >
                {story.title}
              </a>
            ) : (
              story.title
            )}
          </h1>

          {domain && (
            <p className="text-sm text-text-secondary mb-3">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                ({domain})
              </a>
            </p>
          )}

          {story.text && (
            <div className="text-base text-text mb-4 whitespace-pre-wrap">
              {story.text}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>{story.points} {pluralize(story.points, locale, t("unit.point"), t("unit.points"))}</span>
            <a href={`/user/${story.author.username}`} className="text-accent hover:underline">
              {story.author.username}
            </a>
            <span>{formatRelativeTime(story.createdAt, locale)}</span>
            <span>{story.commentCount} {pluralize(story.commentCount, locale, t("unit.comment"), t("unit.comments"))}</span>
          </div>
        </div>

        {/* Comment form */}
        <CommentForm itemId={itemId} isLoggedIn={!!session} />

        {/* Comments */}
        {commentTree.length > 0 ? (
          <CommentThread comments={commentTree} depth={0} />
        ) : (
          <div className="p-4 text-center text-text-secondary">
            {t("item.noComments")}
          </div>
        )}
      </div>
    </>
  );
}
