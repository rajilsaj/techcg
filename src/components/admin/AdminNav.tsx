"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Contact,
  CopyX,
  Download,
  Eye,
  FileText,
  FolderTree,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Plug,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

/** `sub`: a page shown indented under the item before it (e.g. Importation › Guide). */
const ITEMS: { href: string; label: string; icon: LucideIcon; badge?: "comments"; sub?: boolean }[] = [
  { href: "/godmod", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/godmod/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/godmod/visiteurs", label: "Visiteurs", icon: Eye },
  { href: "/godmod/articles", label: "Articles", icon: FileText },
  { href: "/godmod/articles/doublons", label: "Doublons", icon: CopyX, sub: true },
  { href: "/godmod/importation", label: "Importation", icon: Download },
  { href: "/godmod/importation/guide", label: "Guide de configuration", icon: BookOpen, sub: true },
  { href: "/godmod/integrations", label: "Intégrations", icon: Plug },
  { href: "/godmod/commentaires", label: "Commentaires", icon: MessageSquare, badge: "comments" },
  { href: "/godmod/categories", label: "Catégories", icon: FolderTree },
  { href: "/godmod/meta", label: "Méta", icon: Sparkles },
  { href: "/godmod/etiquettes", label: "Étiquettes", icon: Tags },
  { href: "/godmod/medias", label: "Médias", icon: ImageIcon },
  { href: "/godmod/profils", label: "Profiles.CG", icon: Contact },
  { href: "/godmod/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/godmod/menu", label: "Menu", icon: Menu },
  { href: "/godmod/parametres", label: "Réglages", icon: Settings },
  { href: "/godmod/journal", label: "Journal", icon: History },
];

/** Admin sidebar; a horizontal scrolling row on small screens. */
export function AdminNav({ pendingComments }: { pendingComments: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, icon: Icon, badge, sub }) => {
        // A page with its own sub-item is not highlighted while the sub-page is open.
        const deeper = ITEMS.some((i) => i.href !== href && i.href.startsWith(`${href}/`) && pathname.startsWith(i.href));
        const active = href === "/godmod" ? pathname === href : pathname.startsWith(href) && !deeper;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${sub ? "lg:ml-5 lg:py-1.5 lg:text-[13px]" : ""} ${
              active ? "bg-accent font-medium text-white" : "text-text hover:bg-bg hover:text-accent"
            }`}
          >
            <Icon size={sub ? 14 : 16} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
            {badge === "comments" && pendingComments > 0 && (
              <span
                className={`ml-auto rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-white text-accent" : "bg-red-500 text-white"}`}
                title={`${pendingComments} en attente`}
              >
                {pendingComments}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
