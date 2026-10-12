import Link from "next/link";
import { SITE } from "@/lib/site";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { t } from "@/i18n";

const NAV = [
  { href: "/", key: "nav.top" },
  { href: "/recents", key: "nav.newest" },
  { href: "/questions", key: "nav.ask" },
  { href: "/vitrine", key: "nav.show" },
  { href: "/emplois", key: "nav.jobs" },
  { href: "/commentaires", key: "nav.comments" },
] as const;

export async function Header() {
  const session = await getSession();

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-bg">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-accent hover:opacity-80 transition-opacity"
          >
            {SITE.name}
          </Link>

          <div className="flex items-center gap-4 text-sm">
            {NAV.map(({ href, key }) => (
              <Link key={href} href={href} className="text-text hover:text-accent transition-colors">
                {t(key)}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-4 text-sm">
          {session ? (
            <>
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
            <Link href="/connexion" className="text-text hover:text-accent transition-colors">
              {t("nav.login")}
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
