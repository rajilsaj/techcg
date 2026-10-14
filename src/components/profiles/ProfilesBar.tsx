import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { t } from "@/i18n";

/**
 * Slim full-width bar for the sections that hide the site's main menu
 * (Profiles.CG, Sources). Sticky; on phones the app's bottom tab bar takes over
 * the way back to the site.
 */
export async function ProfilesBar({
  href = "/profils",
  brand = (
    <>
      Profiles<span className="text-accent">.CG</span>
    </>
  ),
}: {
  href?: string;
  brand?: ReactNode;
} = {}) {
  const [session, { visibleMenus }] = await Promise.all([getSession(), getSettings()]);
  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-bg/90 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-8 lg:px-12 2xl:px-16">
        <Link href={href} className="flex items-center gap-2 py-1 font-semibold text-text hover:no-underline">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">T</span>
          <span>{brand}</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          <Link
            href="/"
            className="hidden rounded-full px-3 py-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text hover:no-underline md:inline-flex"
          >
            ← {t("profiles.backToSite")}
          </Link>
        </div>
      </header>
      <MobileTabBar username={session?.username ?? null} avatarUrl={session?.avatarUrl ?? null} visible={visibleMenus} />
    </>
  );
}
