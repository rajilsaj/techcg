"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { t } from "@/i18n";

/** How often the homepage asks whether new stories arrived (only while the tab is visible). */
const POLL_MS = 60_000;
/** How long new stories stay highlighted after they're shown. */
const HIGHLIGHT_MS = 6_000;

/**
 * « 3 nouveaux articles » above the list when stories were published since the page
 * loaded (imports from the cron job, members' posts). A click shows them in place,
 * without a full reload, and briefly highlights them. The tab title shows the count.
 *
 * `latestId`: newest homepage story when the page was rendered. `newestHref`: the
 * « Les plus récents » view, used when another sort is shown (new stories would not be on top).
 */
export function NewStoriesNotice({ latestId, sortIsNewest, newestHref }: { latestId: number; sortIsNewest: boolean; newestHref: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const since = useRef(latestId);
  // Newest id the last check reported: the starting point once the new stories are shown.
  const newest = useRef(latestId);
  // Stories newer than this get highlighted once the refreshed list arrives.
  const highlightAfter = useRef<number | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    try {
      const res = await fetch(`/api/home/latest?since=${since.current}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count: number; latestId: number };
      newest.current = Math.max(newest.current, data.latestId);
      setCount(data.count);
    } catch {
      // Offline or the server is busy: try again at the next tick.
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, [check]);

  // The page was refreshed (or navigated): start counting from its newest story, highlight what's new.
  useEffect(() => {
    const after = highlightAfter.current;
    since.current = Math.max(since.current, latestId);
    newest.current = Math.max(newest.current, latestId);
    setCount(0);
    if (after === null) return;
    highlightAfter.current = null;
    const fresh = [...document.querySelectorAll<HTMLElement>("[data-story-id]")].filter((el) => Number(el.dataset.storyId) > after);
    for (const el of fresh) el.classList.add("story-new");
    const timer = window.setTimeout(() => fresh.forEach((el) => el.classList.remove("story-new")), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [latestId]);

  // « (3) Tech.cg » in the tab while new stories wait.
  useEffect(() => {
    if (count === 0) return;
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = `(${count >= 100 ? "99+" : count}) ${base}`;
    return () => {
      document.title = document.title.replace(/^\(\d+\+?\)\s*/, "");
    };
  }, [count]);

  if (count === 0) return null;

  const show = () => {
    highlightAfter.current = since.current;
    // Count from what the server reported, so the notice goes away even if the page keeps its newest story.
    since.current = newest.current;
    setCount(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    startTransition(() => (sortIsNewest ? router.refresh() : router.push(newestHref)));
  };

  const label = count >= 100 ? t("home.newStories.lots") : count === 1 ? t("home.newStories.one") : t("home.newStories.many", { count });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={show}
        disabled={pending}
        aria-live="polite"
        title={t("home.newStories.hint")}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-70"
      >
        <ArrowUp size={16} aria-hidden className={pending ? "animate-bounce" : ""} />
        {label}
      </button>
    </div>
  );
}
