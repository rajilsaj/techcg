import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Plus } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { NavLinks } from "@/components/layout/NavLinks";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { t } from "@/i18n";

export async function Header() {
  const [session, { siteName, visibleMenus }] = await Promise.all([getSession(), getSettings()]);

  // On phones the section links, Publier and the profile move to the bottom tab bar.
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">
              {siteName.charAt(0).toUpperCase()}
            </span>
            {siteName}
          </Link>

          <ThemeToggle />

          <nav className="hidden md:ml-auto md:block">
            <NavLinks visible={visibleMenus} />
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm md:ml-0">
            {/* Publier always sits beside the account control (Connexion, or the avatar menu with Déconnexion). */}
            <Link
              href="/publier"
              className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-1.5 font-medium text-text transition-colors hover:border-accent hover:text-accent md:inline-flex"
            >
              <Plus size={15} aria-hidden />
              {t("nav.submit")}
            </Link>
            {session ? (
              <AccountMenu username={session.username} avatarUrl={session.avatarUrl} karma={session.karma} isAdmin={session.isAdmin} />
            ) : (
              <Link
                href="/connexion"
                className="rounded-full bg-accent px-5 py-1.5 font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </header>
      <MobileTabBar username={session?.username ?? null} avatarUrl={session?.avatarUrl ?? null} visible={visibleMenus} />
    </>
  );
}
