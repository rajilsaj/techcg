import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { KeyRound, Lock, Unlock } from "lucide-react";
import { ProfilesBar } from "@/components/profiles/ProfilesBar";
import { TryIt } from "@/components/api-docs/TryIt";
import { ENDPOINTS, ERROR_CODES, GROUPS, type Endpoint } from "@/lib/api/spec";

export const metadata: Metadata = {
  title: "API",
  description: "L'API publique de Tech.cg : publications, commentaires, discussions, sources et Profiles.CG en JSON.",
};

const METHOD_TONE: Record<Endpoint["method"], string> = {
  GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  POST: "bg-accent/15 text-accent",
  PATCH: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DELETE: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const anchor = (e: Endpoint) => e.id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl bg-bg-secondary p-4 text-xs leading-relaxed text-text sm:text-[13px]">{children}</pre>;
}

/** The example call, with the key only when needed. */
function curl(e: Endpoint, origin: string): string {
  const path = e.path.replace(/\{(\w+)\}/g, (_, name) => String(e.params?.find((p) => p.name === name)?.example ?? `{${name}}`));
  const lines = [`curl${e.method === "GET" ? "" : ` -X ${e.method}`} "${origin}/api/v1${path}"`];
  if (e.auth === "required") lines.push(`  -H "Authorization: Bearer $TECHCG_API_KEY"`);
  if (e.example) lines.push(`  -H "Content-Type: application/json"`, `  -d '${JSON.stringify(e.example)}'`);
  return lines.join(" \\\n");
}

function AuthBadge({ auth }: { auth: Endpoint["auth"] }) {
  if (auth === "required")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-text px-2 py-0.5 text-[11px] font-medium text-bg">
        <Lock size={11} aria-hidden /> Clé requise
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
      <Unlock size={11} aria-hidden /> {auth === "optional" ? "Public (clé facultative)" : "Public"}
    </span>
  );
}

export default async function ApiDocsPage() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "techcg.vercel.app"}`;

  return (
    <>
      <ProfilesBar
        href="/api"
        brand={
          <>
            Tech.cg <span className="text-accent">API</span>
          </>
        }
      />
      <div className="px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-12 2xl:px-16">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">API · v1</p>
          <h1 className="mt-3 text-5xl font-medium leading-[0.92] tracking-tight text-text sm:text-7xl lg:text-8xl">
            (construisez)
            <br />
            avec nos données
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-text-secondary sm:text-base lg:text-lg">
            Les publications, commentaires, discussions, sources et Profiles.CG de Tech.cg en JSON : pour une appli mobile, un bot, un tableau de bord ou un site partenaire.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/mon-espace?onglet=api" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:no-underline hover:opacity-90">
              <KeyRound size={16} aria-hidden /> Créer une clé API
            </Link>
            <a href="/api/v1/openapi.json" className="inline-flex items-center rounded-full bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-text hover:bg-border hover:no-underline">
              OpenAPI (JSON)
            </a>
          </div>
        </header>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
          {/* Contents: a sticky column on wide screens, a scrolling row on phones */}
          <nav aria-label="Sommaire" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <ul className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 text-sm sm:mx-0 sm:px-0 lg:flex-col lg:gap-1">
              {[
                ["demarrer", "Démarrer"],
                ["authentification", "Authentification"],
                ["format", "Réponses et erreurs"],
                ...GROUPS.map((g) => [g.id, g.name]),
              ].map(([href, label]) => (
                <li key={href} className="shrink-0">
                  <a href={`#${href}`} className="block whitespace-nowrap rounded-full bg-bg-secondary px-3 py-1.5 text-text-secondary hover:text-accent hover:no-underline lg:bg-transparent lg:px-2 lg:py-1">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-16">
            <section id="demarrer" className="scroll-mt-20 space-y-4">
              <h2 className="text-2xl font-semibold text-text">Démarrer</h2>
              <p className="text-text-secondary">
                Adresse de base : <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-sm text-text">{origin}/api/v1</code>. Tout est en JSON (UTF-8), les dates en ISO 8601 (UTC). Les lectures publiques ne demandent aucune clé :
              </p>
              <Code>{`curl "${origin}/api/v1/stories?sort=popular&region=congo&limit=5"`}</Code>
              <p className="text-text-secondary">
                L&apos;API est appelable depuis n&apos;importe quel site (CORS ouvert). La liste des points d&apos;accès est aussi disponible en JSON sur{" "}
                <a href="/api/v1" className="text-accent">/api/v1</a>.
              </p>
            </section>

            <section id="authentification" className="scroll-mt-20 space-y-4">
              <h2 className="text-2xl font-semibold text-text">Authentification</h2>
              <p className="text-text-secondary">
                Pour publier, commenter, voter ou savoir qui vous êtes, envoyez votre clé personnelle dans l&apos;en-tête <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-sm text-text">Authorization</code>. Créez-la dans{" "}
                <Link href="/mon-espace?onglet=api" className="text-accent">Mon espace › API</Link> : elle n&apos;est affichée qu&apos;une fois, et vous pouvez la révoquer à tout moment (5 clés au plus).
              </p>
              <Code>{`curl "${origin}/api/v1/me" \\\n  -H "Authorization: Bearer tcg_votre_cle"`}</Code>
              <p className="text-sm text-text-secondary">
                Une clé agit en votre nom : gardez-la secrète, côté serveur (jamais dans le code d&apos;une page web ou d&apos;une appli publiée). Sur le site lui-même, la session du membre connecté suffit.
              </p>
            </section>

            <section id="format" className="scroll-mt-20 space-y-4">
              <h2 className="text-2xl font-semibold text-text">Réponses et erreurs</h2>
              <p className="text-text-secondary">
                Succès : <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-sm text-text">{"{ data, meta? }"}</code>. Les listes se parcourent avec <code className="text-sm">meta.nextCursor</code> (publications, paramètre <code className="text-sm">cursor</code>) ou{" "}
                <code className="text-sm">meta.nextBefore</code> (commentaires, paramètre <code className="text-sm">before</code>) ; <code className="text-sm">null</code> = dernière page.
              </p>
              <p className="text-text-secondary">Erreur : toujours la même forme, avec un code stable à tester plutôt que le message (en français, pour l&apos;affichage).</p>
              <Code>{`{\n  "error": {\n    "code": "validation",\n    "message": "Champ « title » requis.",\n    "details": { "field": "title" }\n  }\n}`}</Code>
              <dl className="divide-y divide-border rounded-xl border border-border text-sm">
                {ERROR_CODES.map((e) => (
                  <div key={e.code} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[3rem_9rem_1fr] sm:gap-3">
                    <dt className="font-mono font-semibold tabular-nums text-text">{e.status}</dt>
                    <dd className="font-mono text-text">{e.code}</dd>
                    <dd className="text-text-secondary">{e.meaning}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-text-secondary">
                Limites : 120 requêtes par minute et par adresse IP ; 5 publications et 30 commentaires par heure et par membre. Au-delà : 429 et l&apos;en-tête <code>Retry-After</code>.
              </p>
            </section>

            {GROUPS.map((group) => (
              <section key={group.id} id={group.id} className="scroll-mt-20">
                <h2 className="text-2xl font-semibold text-text">{group.name}</h2>
                <p className="mt-1 text-text-secondary">{group.description}</p>
                <div className="mt-6 space-y-6">
                  {ENDPOINTS.filter((e) => e.group === group.id).map((e) => {
                    const tryPath =
                      e.method === "GET" && e.auth !== "required"
                        ? `/api/v1${e.path.replace(/\{(\w+)\}/g, (_, name) => String(e.params?.find((p) => p.name === name)?.example ?? ""))}`
                        : null;
                    return (
                      <article key={e.id} id={anchor(e)} className="scroll-mt-20 rounded-2xl border border-border p-4 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${METHOD_TONE[e.method]}`}>{e.method}</span>
                          <code className="break-all font-mono text-sm font-semibold text-text">/api/v1{e.path}</code>
                          <AuthBadge auth={e.auth} />
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-text">{e.summary}</h3>
                        {e.description && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{e.description}</p>}

                        {e.params && e.params.length > 0 && (
                          <>
                            <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-secondary">Paramètres</h4>
                            <dl className="mt-2 divide-y divide-border text-sm">
                              {e.params.map((p) => (
                                <div key={p.name} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                                  <dt>
                                    <code className="font-mono font-semibold text-text">{p.name}</code>
                                    <span className="ml-2 text-xs text-text-secondary">{p.in === "path" ? "chemin" : p.type}</span>
                                  </dt>
                                  <dd className="text-text-secondary">
                                    {p.description}
                                    {p.enum && (
                                      <span className="mt-1 flex flex-wrap gap-1">
                                        {p.enum.map((v) => (
                                          <code key={v} className="rounded bg-bg-secondary px-1.5 py-0.5 text-xs text-text">
                                            {v}
                                          </code>
                                        ))}
                                      </span>
                                    )}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}

                        {e.body && (
                          <>
                            <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-secondary">Corps JSON</h4>
                            <dl className="mt-2 divide-y divide-border text-sm">
                              {e.body.map((f) => (
                                <div key={f.name} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                                  <dt>
                                    <code className="font-mono font-semibold text-text">{f.name}</code>
                                    <span className="ml-2 text-xs text-text-secondary">
                                      {f.type}
                                      {f.required && <span className="ml-1 text-accent">requis</span>}
                                    </span>
                                  </dt>
                                  <dd className="text-text-secondary">{f.description}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}

                        <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-secondary">Exemple</h4>
                        <div className="mt-2">
                          <Code>{curl(e, origin)}</Code>
                        </div>
                        <details className="group mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-accent">Réponse {e.status ?? 200}</summary>
                          <div className="mt-2">
                            <Code>{JSON.stringify(e.response, null, 2)}</Code>
                          </div>
                        </details>
                        {tryPath && <TryIt path={tryPath} />}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
