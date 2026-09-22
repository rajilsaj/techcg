import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/auth/AuthShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Connexion · ${SITE.name}` };

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
