import { requireAdminPage } from "@/lib/admin";
import { getSiteStats } from "@/lib/site-stats";
import { AdminHeader } from "@/components/admin/ui";
import { SiteActivity } from "@/components/indicators/SiteActivity";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  await requireAdminPage("/godmod/statistiques");
  const stats = await getSiteStats();

  return (
    <>
      <AdminHeader title="Statistiques" description={t("indicators.site.subtitle")} />
      <SiteActivity stats={stats} />
    </>
  );
}
