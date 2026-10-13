/** Placeholder rows shown while a story list loads. */
export function StoryListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ol aria-hidden className="animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex gap-3 border-b border-border py-5 sm:gap-4">
          <span className="h-5 w-6 shrink-0 rounded bg-bg-secondary" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-4 w-3/4 rounded bg-bg-secondary" />
            <div className="flex gap-3">
              <div className="h-16 w-28 shrink-0 rounded bg-bg-secondary sm:h-20 sm:w-36" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 rounded bg-bg-secondary" />
                <div className="h-3 w-5/6 rounded bg-bg-secondary" />
              </div>
            </div>
            <div className="h-3 w-1/3 rounded bg-bg-secondary" />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Header-shaped bar, so the page doesn't jump when the real header arrives. */
export function HeaderSkeleton() {
  return <div aria-hidden className="h-[57px] border-b border-border bg-bg" />;
}
