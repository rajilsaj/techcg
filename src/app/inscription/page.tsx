import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/auth/AuthShell";
import { t } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("meta.register") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <Header />
      <AuthShell intent="signup" next={next ?? null} />
    </>
  );
}
