import type { ReactNode } from "react";

/** Grey used for comparison bars next to the accent-coloured highlight. */
const CONTEXT_FILL = "#8c8c8c";

const fr = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
export const formatNumber = (value: number) => fr.format(value);

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg p-5">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** "Voir les données": the same numbers as a table, for screen readers and copying. */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-4 text-xs text-text-secondary">
      <summary className="cursor-pointer select-none hover:text-text">Voir les données</summary>
      <table className="mt-2 w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-border py-1 pr-3 font-medium text-text">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-border py-1 pr-3 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function StatTile({ label, total, last30 }: { label: string; total: number; last30: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-text">{formatNumber(total)}</p>
      <p className="mt-1 text-xs text-text-secondary">
        <span className="font-medium text-text">+{formatNumber(last30)}</span> ces 30 derniers jours
      </p>
    </div>
  );
}

const shortDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** One accent-coloured column per day; hovering a day shows its count. */
export function DailyBars({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="relative flex h-40 items-end gap-0.5 border-b border-border" role="img" aria-label="Publications par jour, 30 derniers jours">
        <span className="absolute -top-1 left-0 text-[10px] tabular-nums text-text-secondary">{max}</span>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-4 rounded-t bg-accent transition-opacity group-hover:opacity-80"
              style={{ height: d.count ? `${(d.count / max) * 100}%` : 0, minHeight: d.count ? 4 : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-border bg-bg px-2 py-1 text-xs text-text shadow group-hover:block">
              <span className="text-text-secondary">{shortDate(d.day)}</span> · <strong>{d.count}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-secondary">
        <span>{shortDate(data[0].day)}</span>
        <span>{shortDate(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

/** Ranked horizontal bars (single hue): label, value, bar. */
export function RankedBars({ items, empty }: { items: { label: ReactNode; key: string; value: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-text-secondary">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-text">{item.label}</span>
            <span className="tabular-nums text-text-secondary">{formatNumber(item.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-bg-secondary">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Horizontal bars comparing entities; the highlighted one is accent, the rest grey. */
export function ComparisonBars({
  rows,
  highlight,
  max,
  suffix = "",
}: {
  rows: { code: string; name: string; value: number | null; year?: string }[];
  highlight: string;
  max: number;
  suffix?: string;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.code} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <span className={row.code === highlight ? "font-semibold text-text" : "text-text-secondary"}>{row.name}</span>
          {row.value === null ? (
            <span className="text-xs text-text-secondary">Non disponible</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-3 flex-1 rounded-r bg-bg-secondary">
                <div
                  className="h-3 rounded-r"
                  style={{
                    width: `${Math.min(100, (row.value / max) * 100)}%`,
                    minWidth: row.value > 0 ? 4 : 0,
                    background: row.code === highlight ? "var(--accent)" : CONTEXT_FILL,
                  }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs tabular-nums text-text">
                {formatNumber(row.value)}
                {suffix} <span className="text-text-secondary">({row.year})</span>
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Single-series line over years with a hover guide and tooltip per year. */
export function TrendLine({ data, unit }: { data: { year: string; value: number }[]; unit: string }) {
  if (data.length < 2) return <p className="text-sm text-text-secondary">Données insuffisantes.</p>;
  const width = 600;
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 4, left: 8 };
  const max = Math.max(100, ...data.map((d) => d.value));
  const x = (i: number) => pad.left + (i / (data.length - 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / max) * (height - pad.top - pad.bottom);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const last = data[data.length - 1];

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-44 w-full" preserveAspectRatio="none" aria-hidden>
          {[0, 50, 100].map((v) => (
            <line key={v} x1={0} x2={width} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {/* Hover columns, laid over the plot in HTML so tooltips aren't distorted */}
        <div className="absolute inset-0">
          {data.map((d, i) => (
            <div
              key={d.year}
              className="group absolute inset-y-0 -translate-x-1/2"
              style={{ left: `${(x(i) / width) * 100}%`, width: `${100 / (data.length - 1)}%` }}
            >
              <div className="absolute inset-y-0 left-1/2 hidden w-px bg-text-secondary/40 group-hover:block" />
              <div
                className="absolute left-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent group-hover:block"
                style={{ top: `${(y(d.value) / height) * 100}%` }}
              />
              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-bg px-2 py-1 text-xs text-text shadow group-hover:block">
                {d.year} · <strong>{formatNumber(d.value)} {unit}</strong>
              </div>
            </div>
          ))}
        </div>
        {[0, 50, 100].map((v) => (
          <span
            key={v}
            className="pointer-events-none absolute left-0 -translate-y-full text-[10px] tabular-nums text-text-secondary"
            style={{ top: `${(y(v) / height) * 100}%` }}
          >
            {v} %
          </span>
        ))}
        <span className="absolute right-0 top-0 rounded bg-bg px-1 text-xs font-semibold text-text">
          {formatNumber(last.value)} {unit} en {last.year}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-secondary">
        <span>{data[0].year}</span>
        <span>{last.year}</span>
      </div>
    </div>
  );
}
