"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderTree,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon; badge?: "comments" }[] = [
  { href: "/godmod", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/godmod/articles", label: "Articles", icon: FileText },
  { href: "/godmod/commentaires", label: "Commentaires", icon: MessageSquare, badge: "comments" },
  { href: "/godmod/categories", label: "Catégories", icon: FolderTree },
  { href: "/godmod/etiquettes", label: "Étiquettes", icon: Tags },
  { href: "/godmod/medias", label: "Médias", icon: ImageIcon },
  { href: "/godmod/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/godmod/parametres", label: "Réglages", icon: Settings },
  { href: "/godmod/journal", label: "Journal", icon: History },
];

/** Admin sidebar; a horizontal scrolling row on small screens. */
export function AdminNav({ pendingComments }: { pendingComments: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/godmod" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-accent font-medium text-white" : "text-text hover:bg-bg hover:text-accent"
            }`}
          >
            <Icon size={16} aria-hidden />
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
