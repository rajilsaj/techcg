import Link from "next/link";
import type { ListedStory } from "@/lib/stories";
import { LOCAL_TAG } from "@/lib/topics";
import { t } from "@/i18n";
import { StoryItem } from "./StoryItem";

/**
 * The latest Congo stories at the top of the homepage, inside a glowing frame in
 * the colours of the Congolese flag (green, yellow, red) so local news stands out.
 */
export function LocalSpotlight({ stories, isLoggedIn }: { stories: ListedStory[]; isLoggedIn: boolean }) {
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="local-news" className="relative mt-6">
      {/* Halo */}
      <div aria-hidden className="local-halo pointer-events-none absolute -inset-2 rounded-[2rem] blur-xl" />
      {/* Flag-coloured frame */}
      <div className="local-frame relative rounded-[1.75rem] p-[2px] shadow-lg">
        <div className="rounded-[calc(1.75rem-2px)] bg-bg px-4 pb-1 pt-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                <span aria-hidden className="local-flag h-3 w-5 rounded-[3px]" />
                {t("local.eyebrow")}
              </p>
              <h2 id="local-news" className="mt-1 text-xl font-bold text-text sm:text-2xl">
                {t("local.title")}
              </h2>
            </div>
            <Link href={`/etiquette/${LOCAL_TAG.slug}`} className="text-sm font-medium text-accent hover:underline">
              {t("local.all")}
            </Link>
          </div>
          <ol className="mt-1">
            {stories.map((story, i) => (
              <StoryItem key={story.id} rank={i + 1} story={story} isLoggedIn={isLoggedIn} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
