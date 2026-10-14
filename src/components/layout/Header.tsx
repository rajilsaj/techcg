import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NavLinks } from "@/components/layout/NavLinks";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { LoadingBar } from "@/components/layout/LoadingBar";
import { Avatar } from "@/components/user/Avatar";
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

          <div className="ml-auto flex items-center gap-4 text-sm md:ml-0">
            {session ? (
              <>
                {session.isAdmin && (
                  <Link href="/godmod" className="text-text hover:text-accent transition-colors">
                    {t("nav.admin")}
                  </Link>
                )}
                <Link href="/publier" className="hidden text-text hover:text-accent transition-colors md:inline">
                  {t("nav.submit")}
                </Link>
                <Link
                  href={`/profil/${session.username}`}
                  className="hidden items-center gap-2 font-medium text-text hover:text-accent transition-colors md:inline-flex"
                >
                  <Avatar src={session.avatarUrl} size={26} />
                  {session.username}{" "}
                  <span className="text-text-secondary" title={t("nav.karmaTitle")}>
                    ({session.karma})
                  </span>
                </Link>
                <LogoutButton />
              </>
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
        <LoadingBar />
      </header>
      <MobileTabBar username={session?.username ?? null} avatarUrl={session?.avatarUrl ?? null} visible={visibleMenus} />
    </>
  );
}
