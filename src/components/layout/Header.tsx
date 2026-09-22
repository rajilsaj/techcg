"use client";

import Link from "next/link";
import { SITE } from "@/lib/site";
import { useT } from "@/i18n/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const NAV = [
  { href: "/", key: "nav.top" },
  { href: "/newest", key: "nav.newest" },
  { href: "/ask", key: "nav.ask" },
  { href: "/show", key: "nav.show" },
  { href: "/jobs", key: "nav.jobs" },
  { href: "/comments", key: "nav.comments" },
] as const;

export function Header() {
  const t = useT();

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

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
