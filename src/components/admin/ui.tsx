import Link from "next/link";
import type { ReactNode } from "react";

/* Shared building blocks for the admin screens (WordPress-style list pages). */

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg p-5">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** "Tous (12) | Publiés (10) | Brouillons (2)": links that set ?statut=. */
export function StatusTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
      {tabs.map((tab, i) => (
        <span key={tab.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">|</span>}
          <Link
            href={hrefFor(tab.key)}
            aria-current={tab.key === active ? "page" : undefined}
            className={tab.key === active ? "font-semibold text-text" : "text-accent hover:underline"}
          >
            {tab.label} {tab.count !== undefined && <span className="text-text-secondary">({tab.count})</span>}
          </Link>
        </span>
      ))}
    </nav>
  );
}

/** GET search form that keeps the other filters as hidden fields. */
export function SearchForm({ action, query, keep, placeholder }: { action: string; query?: string; keep?: Record<string, string | undefined>; placeholder: string }) {
  return (
    <form action={action} method="get" role="search" className="flex gap-2">
      {Object.entries(keep ?? {}).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        className="w-48 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text sm:w-64"
      />
      <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:border-accent hover:text-accent">
        Rechercher
      </button>
    </form>
  );
}

export function AdminPagination({ page, pageCount, hrefFor, total }: { page: number; pageCount: number; hrefFor: (page: number) => string; total: number }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
      <span>
        {total} élément{total > 1 ? "s" : ""}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 && <PageLink href={hrefFor(page - 1)}>‹</PageLink>}
          <span className="px-2">
            Page {page} sur {pageCount}
          </span>
          {page < pageCount && <PageLink href={hrefFor(page + 1)}>›</PageLink>}
        </div>
      )}
    </div>
  );
}

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-md border border-border px-2.5 py-1 text-text hover:border-accent hover:text-accent">
      {children}
    </Link>
  );
}

const NOTICES: Record<string, string> = {
  saved: "Modifications enregistrées.",
  updated: "Éléments mis à jour.",
  trashed: "Éléments déplacés dans la corbeille.",
  restored: "Éléments restaurés.",
  deleted: "Éléments supprimés définitivement.",
  approved: "Commentaires approuvés.",
  unapproved: "Commentaires mis en attente.",
  spam: "Commentaires marqués comme indésirables.",
  replied: "Réponse publiée.",
  created: "Élément créé.",
  "no-selection": "Aucun élément sélectionné.",
  "slug-taken": "Ce slug est déjà utilisé.",
  "self-protect": "Vous ne pouvez pas faire cela sur votre propre compte.",
  "last-admin": "Il doit rester au moins un administrateur.",
  "blob-missing": "Le stockage de fichiers n'est pas configuré.",
  "invalid-url": "Adresse URL invalide.",
  imported: "Importation terminée : de nouveaux articles ont été ajoutés.",
  "import-done": "Importation terminée : aucun nouvel article (voir le résultat ci-dessous).",
  "demo-removed": "Les articles de démonstration ont été supprimés.",
  "name-required": "Le nom est obligatoire.",
  "profiles-imported": "Importation des profils terminée (détail ci-dessous).",
  "profiles-none": "Aucun profil ajouté (détail ci-dessous).",
  "serpapi-ok": "Clé SerpApi vérifiée : la connexion à Google News fonctionne.",
  "serpapi-empty": "Clé SerpApi enregistrée, mais votre compte n'a plus de recherches disponibles ce mois-ci.",
  "serpapi-failed": "La vérification de la clé SerpApi a échoué (détail ci-dessous).",
  "serpapi-refused": "Clé refusée par SerpApi : elle n'a pas été enregistrée. Vérifiez-la sur serpapi.com/manage-api-key.",
  "serpapi-format": "Une clé SerpApi compte 64 caractères (chiffres et lettres a à f). Vérifiez le copier-coller.",
  "serpapi-missing": "Aucune clé SerpApi n'est configurée.",
  "serpapi-removed": "Clé SerpApi supprimée.",
  "subjects-saved": "Sujets Google News enregistrés. Ils seront importés au fil des visites, ou tout de suite depuis la page Importation.",
  analyzed: "Analyse terminée (détail ci-dessous).",
  "subjects-none": "Aucun sujet : les recherches Google News sont arrêtées.",
};

/** The one-time message passed as ?notice= after a form. */
export function AdminNotice({ notice }: { notice?: string }) {
  const text = notice ? NOTICES[notice] : undefined;
  if (!text) return null;
  const warning = ["no-selection", "slug-taken", "self-protect", "last-admin", "blob-missing", "invalid-url", "name-required", "import-done", "profiles-none",
    "serpapi-empty", "serpapi-failed", "serpapi-refused", "serpapi-format", "serpapi-missing", "subjects-none"].includes(notice!);
  return (
    <p
      role="status"
      className={`mb-4 rounded-lg border px-3 py-2 text-sm text-text ${
        warning ? "border-amber-500/50 bg-amber-500/10" : "border-green-600/40 bg-green-600/10"
      }`}
    >
      {text}
    </p>
  );
}

const BADGE_TONES: Record<string, string> = {
  published: "bg-green-600/15 text-green-600",
  draft: "bg-bg-secondary text-text-secondary",
  pending: "bg-amber-500/15 text-amber-700",
  scheduled: "bg-accent/15 text-accent",
  spam: "bg-red-500/15 text-red-600",
  trash: "bg-red-500/10 text-red-600",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[status] ?? BADGE_TONES.draft}`}>
      {label}
    </span>
  );
}

export const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text";
export const buttonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50";
export const primaryButtonClass =
  "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const thClass = "border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary";
export const tdClass = "border-b border-border px-3 py-3 align-top text-sm";

/** Builds an admin URL from a base path and query values, dropping empty ones. */
export function adminHref(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "tous" && !(key === "page" && value === 1)) query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
