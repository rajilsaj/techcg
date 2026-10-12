import Link from "next/link";
import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { pageNumber } from "@/components/list/StoryList";
import { formatRelativeTime, t } from "@/i18n";

export const dynamic = "force-dynamic";

const COMMENTS_PER_PAGE = 30;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CommentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const before = parseInt(params.avant ?? "", 10);

  const rows = await prisma.item.findMany({
    where: {
      type: "comment",
      deleted: false,
      author: { shadowBanned: false },
      ...(Number.isInteger(before) ? { id: { lt: before } } : {}),
    },
    orderBy: { id: "desc" },
    take: COMMENTS_PER_PAGE + 1,
    select: {
      id: true,
      text: true,
      createdAt: true,
      author: { select: { username: true } },
      parent: { select: { id: true, type: true, title: true } },
    },
  });

  const comments = rows.slice(0, COMMENTS_PER_PAGE);
  const last = comments[comments.length - 1];
  const nextHref =
    rows.length > COMMENTS_PER_PAGE && last
      ? `/commentaires?${new URLSearchParams({ avant: String(last.id), page: String(page + 1) })}`
      : undefined;

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeader title={t("section.recentComments")} showSubmit={false} />

        {comments.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-secondary">{t("comments.empty")}</p>
        ) : (
          <ul>
            {comments.map((comment) => (
              <li key={comment.id} className="border-b border-border py-4">
                <p className="text-xs text-text-secondary">
                  <Link href={`/profil/${comment.author.username}`} className="font-medium text-text hover:text-accent">
                    {comment.author.username}
                  </Link>{" "}
                  · {formatRelativeTime(comment.createdAt)}
                  {comment.parent && (
                    <>
                      {" "}· {t("user.on")}{" "}
                      <Link href={`/publication/${comment.parent.id}`} className="text-accent hover:underline">
                        {comment.parent.title || t("common.comment")}
                      </Link>
                    </>
                  )}
                </p>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-text">{comment.text}</p>
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || nextHref) && (
          <nav className="flex items-center justify-between py-6 text-sm">
            <span className="text-text-secondary">{t("pagination.page", { page })}</span>
            {nextHref && (
              <Link
                href={nextHref}
                className="rounded-full border border-accent px-4 py-1.5 font-medium text-accent transition-colors hover:bg-accent hover:text-white"
              >
                {t("pagination.next")}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
