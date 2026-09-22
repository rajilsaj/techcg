import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { MagicLinkComplete } from "@/components/auth/MagicLinkComplete";
import { SITE } from "@/lib/site";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("meta.authComplete")} · ${SITE.name}` };
}

export default function AuthCompletePage() {
  return (
    <>
      <Header />
      <MagicLinkComplete />
    </>
  );
}
