"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Clock,
  Home,
  LayoutGrid,
  LogIn,
  MessageCircleQuestion,
  MessageSquare,
  Newspaper,
  SquarePen,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/i18n";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Avatar } from "@/components/user/Avatar";
import { visibleMenuItems, type MenuId } from "@/lib/menu";

const ICONS: Record<MenuId, LucideIcon> = {
  indicateurs: BarChart3,
  profils: Users,
  sources: Newspaper,
  recents: Clock,
  questions: MessageCircleQuestion,
  vitrine: LayoutGrid,
  emplois: Briefcase,
  commentaires: MessageSquare,
};

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

/**
 * App-style bottom navigation on phones (hidden from `md` up, where the header
 * shows the same links). The page keeps room for it (body:has(#mobile-tabbar) in globals.css).
 */
export function MobileTabBar({
  username,
  avatarUrl,
  visible,
}: {
  username: string | null;
  avatarUrl: string | null;
  visible: MenuId[];
}) {
  const pathname = usePathname() ?? "/";

  const tabs: Tab[] = [
    { href: "/", label: t("nav.top"), icon: Home, match: (p) => p === "/" || p === "/archives" },
    ...visibleMenuItems(visible).map((m) => ({
      href: m.href,
      label: t(m.short),
      icon: ICONS[m.id],
      match: (p: string) => p.startsWith(m.href),
    })),
    { href: "/publier", label: t("nav.submit"), icon: SquarePen, match: (p) => p.startsWith("/publier") },
    username
      ? {
          href: "/mon-espace",
          label: t("nav.mySpace"),
          icon: UserRound,
          match: (p) => p === "/mon-espace" || p === `/profil/${username}`,
        }
      : { href: "/connexion", label: t("nav.login"), icon: LogIn, match: (p) => p === "/connexion" },
  ];

  return (
    <nav
      id="mobile-tabbar"
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <InstallPrompt />
      <ul className="mx-auto grid h-16 max-w-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active ? "font-semibold text-accent" : "text-text-secondary active:text-accent"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-accent/10" : ""}`}
                >
                  {avatarUrl && username && href === "/mon-espace" ? (
                    <Avatar src={avatarUrl} size={24} className={active ? "ring-2 ring-accent" : ""} />
                  ) : (
                    <Icon size={21} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                  )}
                </span>
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
