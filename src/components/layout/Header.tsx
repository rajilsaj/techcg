import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NavLinks } from "@/components/layout/NavLinks";
import { t } from "@/i18n";

export async function Header() {
  const [session, { siteName }] = await Promise.all([getSession(), getSettings()]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">
            {siteName.charAt(0).toUpperCase()}
          </span>
          {siteName}
        </Link>

        <ThemeToggle />

        <nav className="order-last w-full md:order-none md:ml-auto md:w-auto">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm md:ml-0">
          {session ? (
            <>
              {session.isAdmin && (
                <Link href="/godmod" className="text-text hover:text-accent transition-colors">
                  {t("nav.admin")}
                </Link>
              )}
              <Link href="/publier" className="text-text hover:text-accent transition-colors">
                {t("nav.submit")}
              </Link>
              <Link
                href={`/profil/${session.username}`}
                className="font-medium text-text hover:text-accent transition-colors"
              >
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
    </header>
  );
}
