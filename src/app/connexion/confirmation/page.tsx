import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { MagicLinkComplete } from "@/components/auth/MagicLinkComplete";
import { t } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("meta.authComplete") };
}

export default function AuthCompletePage() {
  return (
    <>
      <Header />
      <MagicLinkComplete />
    </>
  );
}
