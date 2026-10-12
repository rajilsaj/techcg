import { fr, type Dictionary } from "./dictionaries/fr";

export type { Dictionary };

export type Key = keyof Dictionary;
export type Vars = Record<string, string | number>;
export type T = (key: Key, vars?: Vars) => string;

/** Looks up a UI string and fills its `{placeholders}`; unknown ones are left intact. */
export const t: T = (key, vars) => {
  const template = fr[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
};

/** "il y a 2 h" style relative time. */
export function formatRelativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;
  if (weeks < 4) return `il y a ${weeks} sem.`;
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

/** French rule: 0 and 1 are singular. */
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`
): string {
  return count > 1 ? plural : singular;
}
