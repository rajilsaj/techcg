import { fr, type Dictionary } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import type { Locale } from "./detect";

export * from "./detect";
export type { Dictionary };

export type Key = keyof Dictionary;
export type Vars = Record<string, string | number>;
export type T = (key: Key, vars?: Vars) => string;

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };

export function translate(locale: Locale, key: Key, vars?: Vars): string {
  const template = DICTIONARIES[locale][key] ?? fr[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

/** "il y a 2 h" / "2h ago" style relative time. */
export function formatRelativeTime(date: Date, locale: Locale): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (locale === "fr") {
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours} h`;
    if (days < 7) return `il y a ${days} j`;
    if (weeks < 4) return `il y a ${weeks} sem.`;
    if (months < 12) return `il y a ${months} mois`;
    return `il y a ${years} an${years > 1 ? "s" : ""}`;
  }

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/** French: 0 and 1 are singular. English: only 1 is singular. */
export function pluralize(
  count: number,
  locale: Locale,
  singular: string,
  plural: string = `${singular}s`
): string {
  const isPlural = locale === "fr" ? count > 1 : count !== 1;
  return isPlural ? plural : singular;
}
