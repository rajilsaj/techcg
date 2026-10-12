import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/auth/AuthShell";
import { SITE } from "@/lib/site";
import { t } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${t("meta.recover")} · ${SITE.name}` };
}

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <Header />
      <AuthShell initialView="recovery" next={next ?? null} />
    </>
  );
}
