import Link from "next/link";
import { History, MessageSquare } from "lucide-react";
import { getDomain } from "@/lib/utils";
import type { ListedStory } from "@/lib/stories";
import { formatRelativeTime, pluralize, t } from "@/i18n";
import { HideableStory, HideButton, VoteButtons } from "./StoryActions";
import { CoverImage } from "@/components/media/CoverImage";
import { isTopic } from "@/lib/topic-list";
import { Avatar } from "@/components/user/Avatar";

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
  // Only the meta tags (Startups, Entrepreneurs, Tech, Événements) are shown.
  const tags = story.tags.map((t) => t.tag).filter((tag) => isTopic(tag.slug));

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
              title={story.originalTitle ? t("story.originalTitle", { title: story.originalTitle }) : undefined}
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
                  <CoverImage src={story.imageUrl} className="h-16 w-28 rounded border border-border sm:h-20 sm:w-36" />
                </a>
              )}
              {excerpt && (
                <p className="line-clamp-3 text-sm leading-5 text-text-secondary">{excerpt}</p>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("story.tags")}>
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/?sujet=${tag.slug}`}
                    className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-accent transition-colors hover:bg-accent/20"
                  >
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <VoteButtons itemId={story.id} vote={story.vote} points={story.points} isLoggedIn={isLoggedIn} />
            <span className="text-xs text-text-secondary">
              {t("story.by")}{" "}
              <Link
                href={`/profil/${story.author.username}`}
                className="inline-flex items-center gap-1 align-middle text-text-secondary underline underline-offset-2 hover:text-accent"
              >
                <Avatar src={story.author.avatarUrl} size={16} />
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
