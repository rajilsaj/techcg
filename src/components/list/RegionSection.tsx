import Link from "next/link";
import type { ReactNode } from "react";
import type { ListedStory } from "@/lib/stories";
import { StoryItem } from "./StoryItem";

/** A titled group of stories on the homepage (Congo, Afrique). */
export function RegionSection({
  id,
  title,
  moreHref,
  moreLabel,
  stories,
  firstRank,
  isLoggedIn,
}: {
  id: string;
  title: ReactNode;
  moreHref: string;
  moreLabel: string;
  stories: ListedStory[];
  firstRank: number;
  isLoggedIn: boolean;
}) {
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <SectionTitle id={id} count={stories.length} more={{ href: moreHref, label: moreLabel }}>
        {title}
      </SectionTitle>
      <ol>
        {stories.map((story, i) => (
          <StoryItem key={story.id} rank={firstRank + i} story={story} isLoggedIn={isLoggedIn} />
        ))}
      </ol>
    </section>
  );
}

/**
 * Section heading without a rule: the title with its count in parentheses,
 * and a pill link on the right.
 */
export function SectionTitle({
  id,
  children,
  more,
  count,
}: {
  id: string;
  children: ReactNode;
  more?: { href: string; label: string };
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-1">
      <div>
        <h2 id={id} className="flex items-baseline gap-2 text-4xl font-extrabold leading-none tracking-tight text-text-secondary/35 sm:text-5xl">
          {children}
          {count !== undefined && (
            <span className="text-sm font-normal tabular-nums text-text-secondary">
              ( {String(count).padStart(2, "0")} )
            </span>
          )}
        </h2>
      </div>
      {more && (
        <Link
          href={more.href}
          className="group inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-accent/10 hover:text-accent hover:no-underline"
        >
          {more.label}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      )}
    </div>
  );
}
