"use client";

import { useState, useTransition } from "react";
import { REGIONS, TOPICS, type RegionSlug, type TopicSlug } from "@/lib/topic-list";
import { resetMetaAction, saveMetaAction, type MetaState } from "@/app/godmod/meta/actions";

/**
 * Meta tag picker: tap a chip to add/remove Startups, Entrepreneurs, Tech or
 * Événements, and pick the region (Congo, Afrique, Monde). Saves on each tap;
 * "Auto" hands the article back to automatic detection.
 */
export function MetaPicker({ itemId, initial, compact = false }: { itemId: number; initial: MetaState; compact?: boolean }) {
  const [meta, setMeta] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const apply = (run: () => Promise<MetaState | { error: string }>, optimistic?: MetaState) => {
    const previous = meta;
    if (optimistic) setMeta(optimistic);
    startTransition(async () => {
      const result = await run();
      if ("error" in result) {
        setMeta(previous);
        setError(result.error);
      } else {
        setMeta(result);
        setError("");
      }
    });
  };

  const toggleTopic = (slug: TopicSlug) => {
    const topics = meta.topics.includes(slug) ? meta.topics.filter((t) => t !== slug) : [...meta.topics, slug];
    apply(() => saveMetaAction(itemId, topics, meta.region), { ...meta, topics, manual: true });
  };
  const setRegion = (region: RegionSlug | null) => {
    apply(() => saveMetaAction(itemId, meta.topics, region), { ...meta, region, manual: true });
  };

  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
      on ? "border-accent bg-accent text-white" : "border-border text-text-secondary hover:border-accent hover:text-accent"
    }`;
  const regionButton = (on: boolean) =>
    `px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${on ? "bg-text text-bg" : "text-text-secondary hover:text-text"}`;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${compact ? "" : "py-1"}`} aria-busy={pending}>
      <div role="group" aria-label="Méta" className="flex flex-wrap gap-1.5">
        {TOPICS.map((topic) => (
          <button
            key={topic.slug}
            type="button"
            disabled={pending}
            aria-pressed={meta.topics.includes(topic.slug)}
            onClick={() => toggleTopic(topic.slug)}
            className={chip(meta.topics.includes(topic.slug))}
          >
            {topic.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Région" className="inline-flex overflow-hidden rounded-full border border-border">
        {[...REGIONS, { slug: null, label: "Monde" } as const].map((region) => (
          <button
            key={region.slug ?? "monde"}
            type="button"
            disabled={pending}
            aria-pressed={meta.region === region.slug}
            onClick={() => setRegion(region.slug)}
            className={regionButton(meta.region === region.slug)}
          >
            {region.label}
          </button>
        ))}
      </div>
      {meta.manual ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => apply(() => resetMetaAction(itemId))}
          title="Revenir à la détection automatique"
          className="text-xs text-text-secondary underline underline-offset-2 hover:text-accent disabled:opacity-60"
        >
          Manuel · repasser en auto
        </button>
      ) : (
        <span className="text-xs text-text-secondary">Auto</span>
      )}
      {error && (
        <span className="text-xs text-red-500" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
