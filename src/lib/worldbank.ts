/**
 * Country tech indicators from the World Bank's public API (no key needed).
 * Responses are cached for a day; the source itself updates about once a year.
 */

const API = "https://api.worldbank.org/v2";
const REVALIDATE_SECONDS = 24 * 60 * 60;

export const ENTITIES = [
  { code: "COG", name: "Congo" },
  { code: "COD", name: "RD Congo" },
  { code: "SSF", name: "Afrique subsaharienne" },
] as const;

export type EntityCode = (typeof ENTITIES)[number]["code"];

export const INDICATORS = [
  { code: "IT.NET.USER.ZS", label: "Utilisateurs d'Internet", unit: "% de la population", percent: true },
  { code: "IT.CEL.SETS.P2", label: "Abonnements mobiles", unit: "pour 100 habitants", percent: false },
  { code: "IT.NET.BBND.P2", label: "Internet haut débit fixe", unit: "abonnements pour 100 habitants", percent: false },
  { code: "EG.ELC.ACCS.ZS", label: "Accès à l'électricité", unit: "% de la population", percent: true },
] as const;

export interface DataPoint {
  value: number;
  year: string;
}

interface WorldBankRow {
  countryiso3code: string;
  date: string;
  value: number | null;
}

async function query(path: string): Promise<WorldBankRow[] | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as [unknown, WorldBankRow[] | null];
    return Array.isArray(body) && Array.isArray(body[1]) ? body[1] : null;
  } catch {
    return null;
  }
}

export interface IndicatorComparison {
  code: string;
  label: string;
  unit: string;
  percent: boolean;
  values: { code: EntityCode; name: string; point: DataPoint | null }[];
}

/** Latest available value of each indicator for Congo, the DRC and Sub-Saharan Africa. */
export async function getCountryIndicators(): Promise<IndicatorComparison[] | null> {
  const codes = ENTITIES.map((e) => e.code).join(";");
  const results = await Promise.all(
    INDICATORS.map((indicator) => query(`/country/${codes}/indicator/${indicator.code}?format=json&mrnev=1`))
  );
  if (results.every((rows) => rows === null)) return null;

  return INDICATORS.map((indicator, i) => ({
    ...indicator,
    values: ENTITIES.map((entity) => {
      const row = results[i]?.find((r) => r.countryiso3code === entity.code && r.value !== null);
      return { code: entity.code, name: entity.name, point: row ? { value: row.value!, year: row.date } : null };
    }),
  }));
}

/** Yearly share of Congo's population using the Internet, oldest first. */
export async function getCongoInternetTrend(fromYear = 2010): Promise<DataPoint[]> {
  const rows = await query(
    `/country/COG/indicator/IT.NET.USER.ZS?format=json&date=${fromYear}:${new Date().getFullYear()}&per_page=100`
  );
  return (rows ?? [])
    .filter((r) => r.value !== null)
    .map((r) => ({ year: r.date, value: r.value! }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
