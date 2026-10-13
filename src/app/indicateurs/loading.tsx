import { HeaderSkeleton } from "@/components/list/StoryListSkeleton";

export default function IndicatorsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mx-auto max-w-5xl animate-pulse px-4 pt-10" role="status" aria-label="Chargement des indicateurs">
        <div className="h-9 w-48 rounded bg-bg-secondary" />
        <div className="mt-10 h-5 w-64 rounded bg-bg-secondary" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-bg-secondary/50" />
          ))}
        </div>
      </div>
    </>
  );
}
