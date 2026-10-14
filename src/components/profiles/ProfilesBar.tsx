import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { t } from "@/i18n";

/** Slim full-width bar for Profiles.CG, which hides the site's main menu. */
export function ProfilesBar() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 lg:px-12 2xl:px-16">
      <Link href="/profils" className="flex items-center gap-2 font-semibold text-text hover:no-underline">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">T</span>
        <span>
          Profiles<span className="text-accent">.CG</span>
        </span>
      </Link>
      <div className="flex items-center gap-2 text-sm">
        <ThemeToggle />
        <Link href="/" className="rounded-full px-3 py-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text hover:no-underline">
          ← {t("profiles.backToSite")}
        </Link>
      </div>
    </header>
  );
}
