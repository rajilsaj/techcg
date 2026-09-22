import { MessageCircle, User, Globe } from "lucide-react";
import { formatTime, getDomain, pluralize } from "@/lib/utils";
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

export function StoryRow({
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
  const domain = url ? getDomain(url) : "";
  const domain_label = domain || "texte";
  const timeAgo = formatTime(createdAt);

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
              {title || "Sans titre"}
            </a>
          ) : (
            <div className="text-base font-medium text-text">{title || "Sans titre"}</div>
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
          label={`${commentCount} ${pluralize(commentCount, "commentaire")}`}
          href={`/item/${id}`}
        />
      </div>
    </div>
  );
}
