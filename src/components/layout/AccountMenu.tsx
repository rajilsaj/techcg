"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { Avatar } from "@/components/user/Avatar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { t } from "@/i18n";

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-bg-secondary hover:text-accent";

/** The member's avatar in the header; opens a menu with Profil, Mon espace, Admin and Déconnexion. */
export function AccountMenu({ username, avatarUrl, karma, isAdmin }: { username: string; avatarUrl: string; karma: number; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button[aria-haspopup]")?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.accountMenu")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 font-medium text-text transition-colors hover:text-accent md:pr-2"
      >
        <Avatar src={avatarUrl} size={26} />
        <span className="hidden md:inline">
          {username}{" "}
          <span className="text-text-secondary" title={t("nav.karmaTitle")}>
            ({karma})
          </span>
        </span>
        <ChevronDown size={14} aria-hidden className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-bg p-1.5 shadow-lg">
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-text-secondary md:hidden">
            {username} ({karma})
          </p>
          <Link role="menuitem" href={`/profil/${username}`} className={ITEM}>
            <UserRound size={16} aria-hidden className="text-text-secondary" />
            {t("nav.myProfile")}
          </Link>
          <Link role="menuitem" href="/mon-espace" className={ITEM}>
            <LayoutDashboard size={16} aria-hidden className="text-text-secondary" />
            {t("nav.mySpace")}
          </Link>
          {isAdmin && (
            <Link role="menuitem" href="/godmod" className={ITEM}>
              <Shield size={16} aria-hidden className="text-text-secondary" />
              {t("nav.admin")}
            </Link>
          )}
          <div className="my-1.5 border-t border-border" />
          <LogoutButton className={`${ITEM} disabled:opacity-60`}>
            <LogOut size={16} aria-hidden className="text-text-secondary" />
            {t("nav.logout")}
          </LogoutButton>
        </div>
      )}
    </div>
  );
}
