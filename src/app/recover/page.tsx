import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/auth/AuthShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Account help · ${SITE.name}` };

export default function RecoverPage() {
  return (
    <>
      <Header />
      <Suspense>
        <AuthShell initialView="recovery" />
      </Suspense>
    </>
  );
}
