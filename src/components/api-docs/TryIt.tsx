"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** « Essayer »: calls a public GET endpoint from the browser and shows the JSON. */
export function TryIt({ path }: { path: string }) {
  const [result, setResult] = useState<{ status: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const response = await fetch(path, { headers: { Accept: "application/json" } });
      const body = await response.json().catch(() => null);
      const text = JSON.stringify(body, null, 2) ?? "";
      setResult({ status: response.status, body: text.length > 6000 ? `${text.slice(0, 6000)}\n…` : text });
    } catch {
      setResult({ status: 0, body: "Requête impossible (hors ligne ?)." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-text px-3.5 py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Play size={12} aria-hidden />
        {busy ? "Appel…" : "Essayer"}
        <code className="hidden font-mono font-normal opacity-70 sm:inline">GET {path}</code>
      </button>
      {result && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          <p className={`px-3 py-1.5 text-xs font-semibold ${result.status >= 200 && result.status < 300 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
            HTTP {result.status || "—"}
          </p>
          <pre className="max-h-80 overflow-auto bg-bg-secondary p-3 text-xs leading-relaxed text-text">{result.body}</pre>
        </div>
      )}
    </div>
  );
}
