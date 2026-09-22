import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { MagicLinkComplete } from "@/components/auth/MagicLinkComplete";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Signing in · ${SITE.name}` };

export default function AuthCompletePage() {
  return (
    <>
      <Header />
      <MagicLinkComplete />
    </>
  );
}
