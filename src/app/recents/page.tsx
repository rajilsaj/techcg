import { StoryListPage } from "@/components/list/StoryListPage";
import { HOME_STORIES } from "@/lib/story-filters";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function NewestPage({ searchParams }: PageProps) {
  return (
    <StoryListPage
      title={t("section.newest")}
      pathname="/recents"
      where={HOME_STORIES}
      order="newest"
      searchParams={searchParams}
    />
  );
}
