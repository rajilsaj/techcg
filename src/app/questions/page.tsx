import { StoryListPage } from "@/components/list/StoryListPage";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function AskPage({ searchParams }: PageProps) {
  return (
    <StoryListPage
      title={t("section.ask")}
      pathname="/questions"
      where={{ type: "ask" }}
      order="rank"
      searchParams={searchParams}
    />
  );
}
