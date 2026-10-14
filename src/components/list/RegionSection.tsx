import Link from "next/link";
import type { ReactNode } from "react";
import type { ListedStory } from "@/lib/stories";
import { StoryItem } from "./StoryItem";

/** A titled group of stories on the homepage (Au Congo, En Afrique). */
export function RegionSection({
  id,
  title,
  eyebrow,
  moreHref,
  moreLabel,
  stories,
  firstRank,
  isLoggedIn,
  marker,
}: {
  marker: "congo" | "afrique";
  id: string;
  title: ReactNode;
  eyebrow: string;
  moreHref: string;
  moreLabel: string;
  stories: ListedStory[];
  firstRank: number;
  isLoggedIn: boolean;
}) {
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <SectionTitle id={id} eyebrow={eyebrow} marker={marker} count={stories.length} more={{ href: moreHref, label: moreLabel }}>
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

const MARKERS = {
  // The Congolese flag, diagonal: green, yellow, red.
  congo: "h-2.5 w-4 rounded-[2px] bg-[linear-gradient(135deg,#009543_0_40%,#fbde4a_40%_60%,#dc241f_60%_100%)]",
  afrique: "h-2 w-2 rounded-full bg-amber-500",
  monde: "h-2 w-2 rounded-full bg-accent",
} as const;

/**
 * Section heading without a rule: a coloured marker and small uppercase line,
 * the title with its count in parentheses, and a pill link on the right.
 */
export function SectionTitle({
  id,
  eyebrow,
  children,
  more,
  marker = "monde",
  count,
}: {
  id: string;
  eyebrow: string;
  children: ReactNode;
  more?: { href: string; label: string };
  marker?: keyof typeof MARKERS;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-1">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
          <span aria-hidden className={`inline-block shrink-0 ${MARKERS[marker]}`} />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">
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
