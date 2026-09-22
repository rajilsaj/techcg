import { MessageCircle, User, Globe } from "lucide-react";
import { getDomain } from "@/lib/utils";
import { formatRelativeTime, pluralize } from "@/i18n";
import { getLocale, getT } from "@/i18n/server";
import { MetaItem } from "./MetaItem";
import { VoteButton } from "./VoteButton";

export interface StoryRowProps {
  rank: number;
  id: number;
  title: string | null;
  url?: string;
  author: string;
  points: number;
  commentCount: number;
  createdAt: Date;
  isVoted?: boolean;
  isLoggedIn?: boolean;
}

export async function StoryRow({
  rank,
  id,
  title,
  url,
  author,
  points,
  commentCount,
  createdAt,
  isVoted,
  isLoggedIn,
}: StoryRowProps) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const domain = url ? getDomain(url) : "";
  const domain_label = domain || t("common.textPost");
  const timeAgo = formatRelativeTime(createdAt, locale);
  const displayTitle = title || t("common.untitled");

  return (
    <div className="border-b border-border px-4 py-3 hover:bg-bg-secondary transition-colors">
      {/* Rank and vote on same line, left-aligned */}
      <div className="flex items-start gap-3 mb-2">
        <span className="flex-shrink-0 text-sm font-medium text-text-secondary w-8 text-right">
          {rank}
        </span>

        <VoteButton itemId={id} isVoted={isVoted} isLoggedIn={isLoggedIn} />

        {/* Title section - flexible width */}
        <div className="flex-1 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-text hover:underline block"
            >
              {displayTitle}
            </a>
          ) : (
            <div className="text-base font-medium text-text">{displayTitle}</div>
          )}
        </div>
      </div>

      {/* Metadata row - second line */}
      <div className="flex items-center gap-4 ml-11 text-xs">
        <MetaItem
          icon={User}
          label={author}
          href={`/user/${author}`}
        />

        {url && (
          <MetaItem
            icon={Globe}
            label={domain_label}
            href={`https://${domain}`}
          />
        )}

        <span className="text-text-secondary">{timeAgo}</span>

        <MetaItem
          icon={MessageCircle}
          label={`${commentCount} ${pluralize(commentCount, locale, t("unit.comment"), t("unit.comments"))}`}
          href={`/item/${id}`}
        />
      </div>
    </div>
  );
}
