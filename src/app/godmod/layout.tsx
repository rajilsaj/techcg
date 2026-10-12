import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage("/godmod");
  const [settings, pendingComments] = await Promise.all([
    getSettings(),
    prisma.item.count({ where: { type: "comment", status: "pending" } }),
  ]);

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <Link href="/godmod" className="flex items-center gap-2 font-semibold text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-text text-sm font-bold text-accent">
              {settings.siteName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{settings.siteName}</span>
            <span className="text-xs font-normal text-text-secondary">Admin</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent">
            Voir le site <ExternalLink size={13} aria-hidden />
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <ThemeToggle />
            <span className="hidden text-text sm:inline">{session.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="lg:flex">
        <aside className="border-b border-border bg-bg-secondary p-3 lg:sticky lg:top-[53px] lg:h-[calc(100vh-53px)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <AdminNav pendingComments={pendingComments} />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
