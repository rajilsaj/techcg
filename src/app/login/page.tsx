import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/auth/AuthShell";
import { SITE } from "@/lib/site";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("meta.login")} · ${SITE.name}` };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <Header />
      <AuthShell intent="signin" next={next ?? null} />
    </>
  );
}
