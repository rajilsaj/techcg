"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n";

/** Where a visitor's own choice is kept. Without one, the site follows the device. */
export const THEME_KEY = "theme-choice";

function apply(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

/**
 * Rising-sun theme switch: the sun is up in light mode and sets below the horizon
 * (stars come out) in dark mode. The initial theme is applied by a script in the
 * root layout; until the visitor picks one, it follows the device setting live.
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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
      className="group grid h-9 w-9 place-items-center rounded-full text-accent transition-colors hover:bg-bg-secondary"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 overflow-visible" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
        <defs>
          <clipPath id="above-horizon">
            <rect x="0" y="-4" width="24" height="21" />
          </clipPath>
        </defs>

        {/* Stars, out at night */}
        <g className={`transition-opacity duration-700 ${isDark ? "opacity-100 delay-300" : "opacity-0"}`} fill="currentColor" stroke="none">
          <circle cx="5" cy="6" r="0.9" />
          <circle cx="18.5" cy="4.5" r="0.7" />
          <circle cx="15" cy="9" r="0.6" />
        </g>

        {/* The sun: rays and disc rise above the horizon, or set below it */}
        <g clipPath="url(#above-horizon)">
          <g
            className="transition-transform duration-700 ease-[cubic-bezier(0.3,1.4,0.5,1)] group-hover:-translate-y-0.5"
            style={{ transform: isDark ? "translateY(9px)" : "translateY(0)" }}
          >
            <circle cx="12" cy="14" r="4" fill="currentColor" fillOpacity={0.15} />
            <g className={`origin-[12px_14px] transition-all duration-500 ${isDark ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}>
              <path d="M12 6.5V5M6.7 8.7l-1-1M17.3 8.7l1-1M4.5 14H3M21 14h-1.5" />
            </g>
          </g>
        </g>

        {/* Horizon */}
        <path d="M2.5 17h19" />
        <path d="M7 20.5h10" className="opacity-60" />
      </svg>
    </button>
  );
}
