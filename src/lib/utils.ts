export function formatTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks} sem.`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `il y a ${years} ${pluralize(years, "an")}`;
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** French plural: 0 and 1 take the singular. */
export function pluralize(count: number, singular: string, plural: string = singular + "s"): string {
  return count > 1 ? plural : singular;
}
