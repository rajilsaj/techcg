import { notFound } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { getDomain } from "@/lib/utils";
import { formatRelativeTime, pluralize, t } from "@/i18n";
import { CommentThread } from "@/components/item/CommentThread";
import { CommentForm } from "@/components/item/CommentForm";
import { buildCommentTree, CommentData } from "@/lib/thread";
import { enrichStory, needsEnrichment } from "@/lib/enrich-story";
import { VoteButtons } from "@/components/list/StoryActions";
import { pillClass } from "@/components/list/pill";
import { ShareButton } from "@/components/ui/ShareButton";
import { MessageCircle } from "lucide-react";
import { viewerVotes } from "@/lib/votes";
import { avatarUrl } from "@/lib/gravatar";
import { Avatar } from "@/components/user/Avatar";
import { STATUS_LABELS, isItemStatus, isPubliclyVisible, publiclyVisible } from "@/lib/content-status";
import { CoverImage } from "@/components/media/CoverImage";
import { TopicCover, coverTopic } from "@/components/media/TopicCover";

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

  // Fetch story
  const story = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      text: true,
      excerpt: true,
      excerptLang: true,
      imageUrl: true,
      previewAt: true,
      readingMinutes: true,
      tags: { select: { tag: { select: { slug: true } } } },
      status: true,
      publishAt: true,
      author: {
        select: {
          username: true,
          email: true,
        },
      },
      points: true,
      commentCount: true,
      createdAt: true,
    },
  });

  // Hidden stories (draft, trash…) 404 for the public; admins can still open them.
  const visible = !!story && isPubliclyVisible(story);
  if (!story || story.type === "comment" || (!visible && !session?.isAdmin)) {
    notFound();
  }

  if (needsEnrichment(story)) after(() => enrichStory(story.id));

  // No picture, or none worth a cover: the topic's illustration instead.
  const coverClass = "h-40 w-full shrink-0 rounded sm:h-28 sm:w-48";
  const topicCover = (
    <TopicCover topic={coverTopic(story.tags.map((t) => t.tag.slug), `${story.title ?? ""} ${story.excerpt ?? ""}`)} size="lg" className={coverClass} />
  );

  const vote = (await viewerVotes(session?.userId, [itemId])).get(itemId) ?? 0;

  // Fetch all comments for this story
  const commentRows = await prisma.item.findMany({
    where: {
      parentId: itemId,
      type: "comment",
      ...publiclyVisible(),
    },
    select: {
      id: true,
      text: true,
      author: {
        select: {
          username: true,
          email: true,
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
    authorAvatar: avatarUrl(row.author.email, row.author.username),
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
        {!visible && (
          <p className="mx-4 mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-text">
            {t("item.hiddenNotice", { status: isItemStatus(story.status) ? STATUS_LABELS[story.status] : story.status })}{" "}
            <a href={`/godmod/articles/${story.id}`} className="font-medium text-accent hover:underline">
              {t("item.editInAdmin")}
            </a>
          </p>
        )}
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
              <a href={`/site/${domain}`} className="text-accent hover:underline">
                {domain}
              </a>
            </p>
          )}

          {story.url && (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-bg-secondary p-3 transition-colors hover:border-text-secondary sm:flex-row"
            >
              {story.imageUrl ? (
                <CoverImage src={story.imageUrl} eager className={coverClass} fallback={topicCover} />
              ) : (
                topicCover
              )}
              {story.excerpt && (
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    {t("story.excerptLabel")}
                  </p>
                  <p className="mt-1 text-sm text-text">{story.excerpt}</p>
                </div>
              )}
            </a>
          )}

          {story.text && (
            <div className="text-base text-text mb-4 whitespace-pre-wrap">
              {story.text}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <a href={`/profil/${story.author.username}`} className="inline-flex items-center gap-1.5 text-accent hover:underline">
              <Avatar src={avatarUrl(story.author.email, story.author.username)} size={20} />
              {story.author.username}
            </a>
            <span>{formatRelativeTime(story.createdAt)}</span>
            {story.readingMinutes && <span>{t("story.readingTime", { minutes: story.readingMinutes })}</span>}
          </div>

          {/* Action pills: ↑ score ↓ · comments · share */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <VoteButtons itemId={story.id} vote={vote} points={story.points} isLoggedIn={!!session} />
            <a
              href="#commentaires"
              className={pillClass}
              aria-label={`${story.commentCount} ${pluralize(story.commentCount, t("unit.comment"), t("unit.comments"))}`}
            >
              <MessageCircle size={16} aria-hidden />
              <span className="tabular-nums">{story.commentCount}</span>
            </a>
            <ShareButton path={`/publication/${story.id}`} title={story.title ?? "Tech.cg"} className={pillClass} />
          </div>
        </div>

        {/* Comment form */}
        <div id="commentaires" className="scroll-mt-20" />
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
