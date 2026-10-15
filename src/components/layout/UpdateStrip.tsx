"use client";

import { useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import type { ImportStatus } from "@/lib/import-status";
import { t } from "@/i18n";

/** While the next update is due, ask how it went this often; otherwise every few minutes. */
const DUE_POLL_MS = 30_000;
const IDLE_POLL_MS = 5 * 60_000;

const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function ago(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return t("updates.justNow");
  if (minutes < 60) return t("updates.minutesAgo", { n: minutes });
  return t("updates.hoursAgo", { n: Math.floor(minutes / 60) });
}

/** "12:05" (minutes:seconds), or "1 h 05" beyond an hour. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Thin strip under the main menu: when the news was last updated (imports by the
 * scheduled job or by visits), when the next update is due, and a live countdown.
 * Times are shown in the visitor's time zone, so it renders after mounting.
 */
export function UpdateStrip({ initial }: { initial: ImportStatus }) {
  const [status, setStatus] = useState(initial);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const next = status.nextAt ? new Date(status.nextAt).getTime() : null;
  const due = next !== null && now !== null && next <= now;

  // Refresh the times: often while an update is due (to see it happen), rarely otherwise.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/import-status", { cache: "no-store" });
        if (res.ok) setStatus((await res.json()) as ImportStatus);
      } catch {
        // Offline: keep the last known times.
      }
    };
    const timer = window.setInterval(refresh, due ? DUE_POLL_MS : IDLE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [due]);

  const last = status.lastAt ? new Date(status.lastAt).getTime() : null;

  return (
    <div aria-label={t("updates.label")} className="border-b border-border bg-bg-secondary/60">
      <p className="mx-auto flex h-8 max-w-5xl items-center gap-x-3 overflow-hidden whitespace-nowrap px-4 text-xs text-text-secondary">
        {now !== null && (
          <>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <RefreshCw size={12} aria-hidden className={`shrink-0 ${due ? "animate-spin text-accent" : ""}`} style={due ? { animationDuration: "2s" } : undefined} />
              {last ? (
                <>
                  <span className="hidden sm:inline">{t("updates.last", { ago: ago(now - last) })}</span>
                  <span className="sm:hidden">{t("updates.lastShort", { ago: ago(now - last) })}</span>
                </>
              ) : (
                t("updates.never")
              )}
            </span>
            {next !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} aria-hidden className="shrink-0" />
                  {due ? (
                    <>
                      <span className="hidden sm:inline">{t("updates.soon")}</span>
                      <span className="sm:hidden">{t("updates.soonShort")}</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">{t("updates.next", { time: timeFormat.format(next) })}</span>
                      <span className="font-medium tabular-nums text-text">{t("updates.in", { left: countdown(next - now) })}</span>
                    </>
                  )}
                </span>
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}
