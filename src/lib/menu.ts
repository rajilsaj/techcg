import type { Key } from "@/i18n";

/** Sections that can appear in the main menu (header on desktop, tab bar on phones). « À la une » is always shown. */
export const MENU_ITEMS = [
  { id: "indicateurs", href: "/indicateurs", label: "nav.indicators", short: "nav.indicators" },
  { id: "profils", href: "/profils", label: "nav.profiles", short: "nav.profilesShort" },
  { id: "sources", href: "/sources", label: "nav.sources", short: "nav.sources" },
  { id: "discussions", href: "/discussions", label: "home.inDiscussion", short: "discussions.brand" },
  { id: "recents", href: "/recents", label: "section.newest", short: "section.newest" },
  { id: "questions", href: "/questions", label: "section.ask", short: "section.ask" },
  { id: "vitrine", href: "/vitrine", label: "section.show", short: "section.show" },
  { id: "emplois", href: "/emplois", label: "section.jobs", short: "section.jobs" },
  { id: "commentaires", href: "/commentaires", label: "section.recentComments", short: "nav.comments" },
] as const satisfies readonly { id: string; href: string; label: Key; short: Key }[];

export type MenuId = (typeof MENU_ITEMS)[number]["id"];
export type MenuItem = (typeof MENU_ITEMS)[number];

/** Shown until an admin changes it: Profiles.CG and Sources (Indicateurs and the older sections are hidden). */
export const DEFAULT_VISIBLE_MENUS: MenuId[] = ["profils", "sources"];

export const isMenuId = (value: unknown): value is MenuId => MENU_ITEMS.some((m) => m.id === value);

/** The visible items, in menu order. */
export const visibleMenuItems = (visible: readonly MenuId[]): MenuItem[] => MENU_ITEMS.filter((m) => visible.includes(m.id));
