"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/mon-espace/actions";

export interface ApiKeyRow {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** « Mon espace › API »: the member's personal keys. */
export function ApiKeys({ keys, max }: { keys: ApiKeyRow[]; max: number }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await createApiKeyAction(name);
    setBusy(false);
    if (result.error || !result.key) return setError(result.error ?? "Création impossible.");
    setCreated(result.key);
    setCopied(false);
    setName("");
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      window.prompt("Copiez votre clé :", created);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">
        Une clé permet à vos applications et scripts d&apos;utiliser l&apos;API en votre nom (publier, commenter, voter). Lisez la{" "}
        <Link href="/api" className="text-accent">documentation de l&apos;API</Link>.
      </p>

      {created && (
        <div role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-text">Votre nouvelle clé : copiez-la maintenant, elle ne sera plus affichée.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-bg px-3 py-2 font-mono text-xs text-text sm:text-sm">{created}</code>
            <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-text px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90">
              {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied ? "Copiée" : "Copier"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nom de la clé</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Nom de la clé (ex. Appli mobile, Bot Telegram)"
            className="w-full rounded-full border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <button
          type="submit"
          disabled={busy || keys.length >= max}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <KeyRound size={16} aria-hidden />
          {busy ? "Création…" : "Créer une clé"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {keys.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-text-secondary">Aucune clé pour le moment.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <KeyRound size={18} aria-hidden className="shrink-0 text-text-secondary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{k.name}</p>
                <p className="truncate text-xs text-text-secondary">
                  <code className="font-mono">{k.prefix}…</code> · créée le {date.format(new Date(k.createdAt))} ·{" "}
                  {k.lastUsedAt ? `utilisée le ${date.format(new Date(k.lastUsedAt))}` : "jamais utilisée"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Révoquer « ${k.name} » ? Les applications qui l'utilisent cesseront de fonctionner.`)) return;
                  await revokeApiKeyAction(k.id);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 size={15} aria-hidden />
                <span className="hidden sm:inline">Révoquer</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
