"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/i18n";
import { setLocaleCookie, useLocale, useT } from "@/i18n/client";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    setLocaleCookie(next);
    startTransition(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={t("lang.switch")}
      className={`flex items-center rounded border border-border text-xs font-medium ${pending ? "opacity-60" : ""}`}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === locale}
          aria-label={t(`lang.${code}`)}
          disabled={pending}
          onClick={() => choose(code)}
          className={`px-2 py-1 uppercase transition-colors first:rounded-l last:rounded-r ${
            code === locale
              ? "bg-accent text-white"
              : "text-text-secondary hover:bg-bg-secondary hover:text-text"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
