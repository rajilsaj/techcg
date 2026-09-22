"use client";

import Link from "next/link";
import { SITE } from "@/lib/site";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
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
            <Link href="/" className="text-text hover:text-accent transition-colors">
              À la une
            </Link>
            <Link href="/newest" className="text-text hover:text-accent transition-colors">
              Récents
            </Link>
            <Link href="/ask" className="text-text hover:text-accent transition-colors">
              Questions
            </Link>
            <Link href="/show" className="text-text hover:text-accent transition-colors">
              Vitrine
            </Link>
            <Link href="/jobs" className="text-text hover:text-accent transition-colors">
              Emplois
            </Link>
            <Link href="/comments" className="text-text hover:text-accent transition-colors">
              Commentaires
            </Link>
          </div>
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
