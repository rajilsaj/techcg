"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { t } from "@/i18n";

/** Where a visitor's own choice is kept. Without one, the site follows the device. */
export const THEME_KEY = "theme-choice";

function apply(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/**
 * Light/dark switch: a moon in light mode, a sun in dark mode. The initial theme is
 * applied by a script in the root layout; until the visitor picks one, it follows
 * the device setting live.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = (e: MediaQueryListEvent) => {
      let chosen: string | null = null;
      try {
        chosen = localStorage.getItem(THEME_KEY);
      } catch {}
      if (chosen) return;
      apply(e.matches);
      setIsDark(e.matches);
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    apply(next);
    try {
      // Back to the device setting when the choice matches it anyway.
      const device = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (next === device) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };

  // The icon shows what a tap switches to: a moon in light mode, a sun in dark mode.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
      className="relative grid h-9 w-9 place-items-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-accent"
    >
      <Moon
        size={19}
        aria-hidden
        className={`absolute transition-all duration-300 motion-reduce:transition-none ${isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
      <Sun
        size={20}
        aria-hidden
        className={`absolute transition-all duration-300 motion-reduce:transition-none ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
      />
    </button>
  );
}
