import { cache } from "react";
import { prisma } from "./db";
import { IMPORT_INTERVAL_MINUTES } from "./importer/schedule";

export interface ImportStatus {
  /** Last time news was fetched from a source (scheduled run or visit), ISO, or null before the first import. */
  lastAt: string | null;
  /** The scheduled run after that (ISO); in the past = it is due now. */
  nextAt: string | null;
}

/** The scheduled import runs on the clock, every 30 minutes (:00 and :30, see .github/workflows/import.yml). */
const SLOT_MS = IMPORT_INTERVAL_MINUTES * 60_000;

/** The first scheduled slot strictly after `time`. */
export function nextSlot(time: number): number {
  return (Math.floor(time / SLOT_MS) + 1) * SLOT_MS;
}

/**
 * The news update times shown under the menu: the most recent import of any
 * enabled source, and the scheduled run that follows it. Once per request.
 */
export const importStatus = cache(async (): Promise<ImportStatus> => {
  const latest = await prisma.importSource.aggregate({ where: { enabled: true }, _max: { lastRunAt: true } });
  const last = latest._max.lastRunAt?.getTime() ?? null;
  return {
    lastAt: last ? new Date(last).toISOString() : null,
    nextAt: new Date(nextSlot(last ?? Date.now())).toISOString(),
  };
});
