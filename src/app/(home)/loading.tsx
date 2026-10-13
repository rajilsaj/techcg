import { HeaderSkeleton, StoryListSkeleton } from "@/components/list/StoryListSkeleton";

export default function HomeLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mx-auto max-w-5xl px-4 pt-4" role="status" aria-label="Chargement des articles">
        <StoryListSkeleton />
      </div>
    </>
  );
}
