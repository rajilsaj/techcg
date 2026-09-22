import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { StoryRow } from "@/components/list/StoryRow";
import { formatTime, pluralize } from "@/lib/utils";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserPage({ params }: PageProps) {
  const { username } = await params;

  const session = await getSession();

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      about: true,
      karma: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Fetch user's stories
  const stories = await prisma.item.findMany({
    where: {
      authorId: user.id,
      type: "story",
      deleted: false,
    },
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
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  // Fetch user's comments
  const comments = await prisma.item.findMany({
    where: {
      authorId: user.id,
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
      parent: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  const isOwnProfile = session?.userId === user.id;

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="border-b border-border pb-8 mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">{user.username}</h1>
          <p className="text-sm text-text-secondary mb-4">
            {user.karma} karma · inscription {formatTime(user.createdAt)}
          </p>

          {user.about && (
            <p className="text-base text-text mb-4 whitespace-pre-wrap">
              {user.about}
            </p>
          )}

          {isOwnProfile && (
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="px-3 py-1.5 border border-border text-text-secondary rounded text-sm cursor-not-allowed"
            >
              Modifier le profil · bientôt
            </button>
          )}
        </div>

        {/* Stories */}
        {stories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text mb-4">
              {stories.length} {pluralize(stories.length, "publication")}
            </h2>
            <div className="border border-border rounded">
              {stories.map((story, i) => (
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
                  isLoggedIn={!!session}
                />
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-text mb-4">
              {comments.length} {pluralize(comments.length, "commentaire")}
            </h2>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border border-border rounded p-4 hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-text">
                        {comment.author.username}
                      </span>
                      <span className="text-text-secondary">
                        {comment.points} {pluralize(comment.points, "point")}
                      </span>
                      <span className="text-text-secondary">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-text break-words whitespace-pre-wrap mb-2">
                    {comment.text ? comment.text.slice(0, 200) : ""}
                    {comment.text && comment.text.length > 200 ? "…" : ""}
                  </p>

                  {comment.parent && (
                    <p className="text-xs text-text-secondary">
                      sur{" "}
                      <a
                        href={`/item/${comment.parent.id}`}
                        className="text-accent hover:underline"
                      >
                        "{comment.parent.title}"
                      </a>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {stories.length === 0 && comments.length === 0 && (
          <p className="text-center text-text-secondary">
            Aucune publication ni commentaire pour le moment
          </p>
        )}
      </div>
    </>
  );
}
