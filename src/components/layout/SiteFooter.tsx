"use client";

import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { t } from "@/i18n";

/** Site-wide footer with the project credits. Not shown in the admin. */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/godmod")) return null;

  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-6 text-center text-xs text-text-secondary">
        <p>
          {t("footer.proudly")} <span className="font-semibold text-text">IALab · BantuHub Foundation</span> · {t("footer.claude")}
        </p>
        <p>
          © {new Date().getFullYear()} {SITE.name} · {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
