import Link from "next/link";
import { History, MessageSquare } from "lucide-react";
import { getDomain } from "@/lib/utils";
import type { ListedStory } from "@/lib/stories";
import { formatRelativeTime, pluralize, t } from "@/i18n";
import { HideableStory, HideButton, LikeButton } from "./StoryActions";

export interface StoryItemProps {
  rank: number;
  story: ListedStory;
  isLoggedIn: boolean;
}

const actionClass =
  "inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors";

export function StoryItem({ rank, story, isLoggedIn }: StoryItemProps) {
  const domain = story.url ? getDomain(story.url) : "";
  const title = story.title || t("common.untitled");
  const href = story.url || `/publication/${story.id}`;
  // Link posts show the article's excerpt; text posts show the start of their text.
  const excerpt = story.excerpt ?? (story.url ? null : story.text);

  return (
    <HideableStory itemId={story.id}>
      <li className="flex gap-3 border-b border-border py-5 sm:gap-4">
        <span className="w-6 shrink-0 text-right text-lg font-semibold leading-6 text-accent tabular-nums">
          {rank}
        </span>

        <article className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-6 text-text">
            <a
              href={href}
              {...(story.url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-text hover:underline"
            >
              {title}
            </a>
            {domain && (
              <Link
                href={`/site/${domain}`}
                className="ml-2 align-middle text-xs font-normal text-accent underline-offset-2 hover:underline"
              >
                {domain}
              </Link>
            )}
          </h2>

          {(story.imageUrl || excerpt) && (
            <div className="mt-2 flex gap-3">
              {story.imageUrl && (
                <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0" tabIndex={-1}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party hosts */}
                  <img
                    src={story.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-16 w-28 rounded border border-border bg-bg-secondary object-cover sm:h-20 sm:w-36"
                  />
                </a>
              )}
              {excerpt && (
                <p className="line-clamp-3 text-sm leading-5 text-text-secondary">{excerpt}</p>
              )}
            </div>
          )}

          <p className="mt-2 text-sm font-semibold text-text">
            {story.points} {pluralize(story.points, t("unit.point"), t("unit.points"))}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs text-text-secondary">
              {t("story.by")}{" "}
              <Link
                href={`/profil/${story.author.username}`}
                className="text-text-secondary underline underline-offset-2 hover:text-accent"
              >
                {story.author.username}
              </Link>{" "}
              · {formatRelativeTime(story.createdAt)}
              {story.category && (
                <>
                  {" "}
                  · {t("story.in")}{" "}
                  <Link href={`/categorie/${story.category.slug}`} className="text-accent hover:underline">
                    {story.category.name}
                  </Link>
                </>
              )}
            </span>
            <LikeButton itemId={story.id} voted={story.voted} isLoggedIn={isLoggedIn} />
            <HideButton itemId={story.id} isLoggedIn={isLoggedIn} />
            {domain && (
              <Link href={`/site/${domain}`} className={actionClass}>
                <History size={14} aria-hidden />
                {t("story.history")}
              </Link>
            )}
            <Link href={`/publication/${story.id}`} className={actionClass}>
              <MessageSquare size={14} aria-hidden />
              {story.commentCount > 0
                ? `${story.commentCount} ${pluralize(story.commentCount, t("unit.comment"), t("unit.comments"))}`
                : t("story.discuss")}
            </Link>
          </div>
        </article>
      </li>
    </HideableStory>
  );
}
