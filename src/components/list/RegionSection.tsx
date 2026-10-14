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
}: {
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
    <section aria-labelledby={id} className="mt-8">
      <SectionTitle id={id} eyebrow={eyebrow} more={{ href: moreHref, label: moreLabel }}>
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

/** Small uppercase line, title, and an optional link on the right. */
export function SectionTitle({ id, eyebrow, children, more }: { id: string; eyebrow: string; children: ReactNode; more?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{eyebrow}</p>
        <h2 id={id} className="mt-0.5 text-xl font-bold text-text sm:text-2xl">
          {children}
        </h2>
      </div>
      {more && (
        <Link href={more.href} className="text-sm font-medium text-accent hover:underline">
          {more.label}
        </Link>
      )}
    </div>
  );
}
