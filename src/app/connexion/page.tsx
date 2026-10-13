import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";
import { t } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("meta.login") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthPage intent="signin" next={next ?? null} />;
}
