import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { SubmitForm } from "@/components/forms/SubmitForm";
import { t } from "@/i18n";
import { getSettings } from "@/lib/settings";
import { listCategories } from "@/lib/taxonomy";

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function SubmitPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/connexion");
  }

  const params = await searchParams;
  const defaultType = params.type || "story";
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);
  const closed = !settings.submissionsOpen && !session.isAdmin;

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-text mb-8">{t("submit.heading")}</h1>
        {closed ? (
          <p className="rounded-lg border border-border bg-bg-secondary p-4 text-text-secondary">{t("submit.closed")}</p>
        ) : (
          <SubmitForm defaultType={defaultType} categories={categories} />
        )}
      </div>
    </>
  );
}
