import { StoryListPage } from "@/components/list/StoryListPage";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function JobsPage({ searchParams }: PageProps) {
  return (
    <StoryListPage
      title={t("section.jobs")}
      pathname="/emplois"
      where={{ type: "job" }}
      order="rank"
      searchParams={searchParams}
    />
  );
}
