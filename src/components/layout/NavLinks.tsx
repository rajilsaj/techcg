"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Key } from "@/i18n";
import { visibleMenuItems, type MenuId } from "@/lib/menu";

/** Section links; the current one is underlined like in the design. Admins choose which appear (Admin › Menu). */
export function NavLinks({ visible }: { visible: MenuId[] }) {
  const pathname = usePathname();
  const NAV: { href: string; key: Key; match?: string[] }[] = [
    { href: "/", key: "nav.top", match: ["/", "/archives"] },
    ...visibleMenuItems(visible).map((m) => ({ href: m.href, key: m.label })),
  ];

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
