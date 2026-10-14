"use client";

import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { t } from "@/i18n";

/** Site-wide footer with the project credits. */
export function SiteFooter() {
  const pathname = usePathname();
  // Not in the admin, nor on the full-screen sign-in pages.
  if (pathname?.startsWith("/godmod") || pathname === "/connexion" || pathname === "/inscription") return null;

  return (
    <footer className="mt-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-6 text-center text-xs text-text-secondary">
        <p>
          {t("footer.proudly")} <span className="font-semibold text-text">IALab · BantuHub Foundation</span>
        </p>
        <p>
          © {new Date().getFullYear()} {SITE.name} · {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
