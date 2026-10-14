import { NextRequest, NextResponse } from "next/server";
import { runDueImports } from "@/lib/importer/schedule";
import { isCronAuthorized, recordAutoImport } from "@/lib/cron-auth";

// Imports can take a while (fetching feeds, analysing pages, translating titles).
export const maxDuration = 300;

/**
 * Automatic import: every enabled source that is due (see runDueImports), then
 * ranking. Called every 30 minutes by GitHub Actions (.github/workflows/import.yml)
 * and once a day by Vercel Cron. The last run is shown in Admin › Importation.
 */
export async function GET(request: NextRequest) {
  if (!(await isCronAuthorized(request.headers))) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
  }
  const trigger = request.nextUrl.searchParams.get("trigger") === "github" ? "GitHub Actions" : "Vercel Cron";
  try {
    const tick = await runDueImports({ budgetMs: 240_000 });
    await recordAutoImport({ at: new Date().toISOString(), trigger, ...tick });
    return NextResponse.json({ ok: true, ...tick });
  } catch (err) {
    console.error("[cron/import] failed:", err);
    await recordAutoImport({ at: new Date().toISOString(), trigger, ran: [], ranked: 0, error: "Échec de l'importation automatique" }).catch(() => {});
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Import failed" } }, { status: 500 });
  }
}

export const POST = GET;
