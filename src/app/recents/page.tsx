import { StoryListPage } from "@/components/list/StoryListPage";
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
      where={{ type: "story" }}
      order="newest"
      searchParams={searchParams}
    />
  );
}
