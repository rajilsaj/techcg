import { StoryListPage } from "@/components/list/StoryListPage";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default function ShowPage({ searchParams }: PageProps) {
  return (
    <StoryListPage
      title={t("section.show")}
      pathname="/vitrine"
      where={{ type: "show" }}
      order="rank"
      searchParams={searchParams}
    />
  );
}
