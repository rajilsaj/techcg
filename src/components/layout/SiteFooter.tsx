"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { t } from "@/i18n";

/** Site-wide footer with the project credits. Not shown in the admin. */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/godmod")) return null;

  return (
    <footer className="mt-16 border-t border-border">
      {/* Thin gradient line echoing the credit colours */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-10 text-center">
        <Link href="/" className="flex items-center gap-2 font-semibold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">
            {SITE.name.charAt(0)}
          </span>
          {SITE.name}
        </Link>
        <p className="-mt-3 text-sm text-text-secondary">{t("site.tagline")}</p>

        <div className="relative rounded-2xl border border-border bg-bg-secondary/60 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">{t("footer.proudly")}</p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-lg font-semibold text-text">
            <span className="credit-spin text-accent" aria-hidden="true">
              ✦
            </span>
            IALab
            <span className="text-text-secondary">·</span>
            BantuHub Foundation
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-bg px-3 py-1 text-sm">
            <span aria-hidden="true">✦</span>
            <span className="credit-shimmer font-semibold">{t("footer.claude")}</span>
          </p>
        </div>

        <p className="text-xs text-text-secondary">
          © {new Date().getFullYear()} {SITE.name} · {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
