"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n";

/** "Clair ◯ Sombre" switch. The initial theme is applied by a script in the root layout. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={isDark ? "text-text-secondary" : "font-medium text-text"}>{t("theme.light")}</span>
      <button
        type="button"
        role="switch"
        aria-checked={mounted && isDark}
        aria-label={t("theme.toggle")}
        onClick={toggleTheme}
        className="relative h-5 w-9 shrink-0 rounded-full bg-accent transition-colors"
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            mounted && isDark ? "translate-x-4" : ""
          }`}
        />
      </button>
      <span className={isDark ? "font-medium text-text" : "text-text-secondary"}>{t("theme.dark")}</span>
    </div>
  );
}
