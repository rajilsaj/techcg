import { NextResponse } from "next/server";
import { importStatus } from "@/lib/import-status";

/** GET /api/import-status: last and next news update times (the strip under the menu refreshes from it). */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    return NextResponse.json(await importStatus(), { headers });
  } catch {
    return NextResponse.json({ error: { code: "internal", message: "Erreur interne." } }, { status: 500, headers });
  }
}
