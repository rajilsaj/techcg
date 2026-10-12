"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Key } from "@/i18n";

const NAV: { href: string; key: Key; match?: string[] }[] = [
  { href: "/", key: "nav.top", match: ["/", "/archives"] },
  { href: "/recents", key: "nav.newest" },
  { href: "/questions", key: "nav.ask" },
  { href: "/vitrine", key: "nav.show" },
  { href: "/emplois", key: "nav.jobs" },
  { href: "/commentaires", key: "nav.comments" },
];

/** Section links; the current one is underlined like in the design. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="scrollbar-none flex items-center gap-4 overflow-x-auto text-sm">
      {NAV.map(({ href, key, match }) => {
        const active = (match ?? [href]).includes(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-0.5 transition-colors ${
              active ? "border-text font-medium text-text" : "border-transparent text-text hover:text-accent"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
