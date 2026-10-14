import { prisma } from "../db";
import { refreshRankScores } from "../ranking-job";
import { runImport } from "./run";
import { GOOGLE_NEWS_INTERVAL_MINUTES, isGoogleNewsSource } from "./google-news";

/** A source is re-read at most this often. */
export const IMPORT_INTERVAL_MINUTES = 30;
/** Visitors' page views check for due sources at most this often (per server instance). */
const VISIT_CHECK_MS = 60_000;

export interface ImportTick {
  ran: { name: string; message: string }[];
  ranked: number;
}

/**
 * Imports every enabled source not read in the last 30 minutes (6 hours for
 * Google News searches), stalest first,
 * until the time budget runs out. Each source is claimed atomically (lastRunAt
 * moved to now) so two runs at the same moment never import the same source twice.
 */
export async function runDueImports({
  budgetMs,
  maxSources = Infinity,
  browser = true,
}: {
  budgetMs: number;
  maxSources?: number;
  /** false: skip « Navigateur » sources (the homepage function doesn't ship the browser). */
  browser?: boolean;
}): Promise<ImportTick> {
  const started = Date.now();
  const cutoff = new Date(started - IMPORT_INTERVAL_MINUTES * 60_000);
  const candidates = await prisma.importSource.findMany({
    where: { enabled: true, ...(browser ? {} : { render: false }), OR: [{ lastRunAt: null }, { lastRunAt: { lt: cutoff } }] },
    orderBy: [{ lastRunAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    select: { id: true, name: true, url: true, lastRunAt: true },
  });
  // Google News searches cost SerpApi credits: those sources wait longer between runs.
  const newsCutoff = started - GOOGLE_NEWS_INTERVAL_MINUTES * 60_000;
  const due = candidates.filter((s) => !isGoogleNewsSource(s.url) || !s.lastRunAt || s.lastRunAt.getTime() < newsCutoff);

  const ran: ImportTick["ran"] = [];
  for (const source of due) {
    if (ran.length >= maxSources || Date.now() - started > budgetMs) break;
    const claimed = await prisma.importSource.updateMany({
      where: { id: source.id, lastRunAt: source.lastRunAt },
      data: { lastRunAt: new Date() },
    });
    if (claimed.count === 0) continue; // another run took it
    const result = await runImport(source.id);
    ran.push({ name: source.name, message: result.message });
  }

  const ranked = ran.length > 0 ? await refreshRankScores() : 0;
  return { ran, ranked };
}

let lastVisitCheck = 0;

/**
 * Called after a homepage view (in `after()`): if a source is due, imports one.
 * Keeps the site fresh without any outside scheduler; the daily cron job is a
 * fallback for quiet days.
 */
export async function importOnVisit(): Promise<void> {
  const now = Date.now();
  if (now - lastVisitCheck < VISIT_CHECK_MS) return;
  lastVisitCheck = now;
  try {
    // « Navigateur » sources are left to the scheduled job and « Importer maintenant », whose functions include the browser.
    await runDueImports({ budgetMs: 45_000, maxSources: 1, browser: false });
  } catch (err) {
    console.error("[import] visit-triggered run failed:", err);
  }
}
