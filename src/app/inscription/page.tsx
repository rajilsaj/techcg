import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";
import { t } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("meta.register") };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthPage intent="signup" next={next ?? null} />;
}
