import { getDomain } from "@/lib/utils";
import { t } from "@/i18n";
import { CoverImage } from "@/components/media/CoverImage";

export interface ShowcaseData {
  members: number;
  articles: number;
  headlines: { id: number; title: string; url: string | null; imageUrl: string | null }[];
}

/* A fixed "constellation": the community as connected points. Deterministic, so
   server and client render the same picture. */
function constellation() {
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const points = Array.from({ length: 26 }, () => ({ x: 20 + rand() * 560, y: 20 + rand() * 560, r: 1.5 + rand() * 2.5 }));
  const links: [number, number][] = [];
  points.forEach((a, i) =>
    points.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 135) links.push([i, j]);
    })
  );
  return { points, links };
}

const { points, links } = constellation();
const fr = new Intl.NumberFormat("fr-FR");

/** Branded side of the sign-in page: tagline, live numbers and what's on the front page now. */
export function AuthShowcase({ data }: { data: ShowcaseData }) {
  return (
    <section
      aria-label={t("site.tagline")}
      className="auth-showcase relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#0066ff] via-[#0057d9] to-[#0a2a7a] p-6 text-white sm:p-10"
    >
      {/* Network drawing */}
      <svg viewBox="0 0 600 600" aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[520px] w-[520px] opacity-60 sm:h-[680px] sm:w-[680px]">
        {links.map(([i, j], n) => (
          <line
            key={n}
            x1={points[i].x}
            y1={points[i].y}
            x2={points[j].x}
            y2={points[j].y}
            stroke="white"
            strokeOpacity="0.25"
            strokeWidth="1"
            className="auth-link"
            style={{ animationDelay: `${(n % 9) * 0.4}s` }}
          />
        ))}
        {points.map((p, n) => (
          <circle key={n} cx={p.x} cy={p.y} r={p.r} fill="white" className="auth-dot" style={{ animationDelay: `${(n % 7) * 0.5}s` }} />
        ))}
      </svg>
      <div aria-hidden="true" className="auth-orb absolute -bottom-32 -left-20 -z-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />

      <p className="auth-rise inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur" style={{ animationDelay: "0.05s" }}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
        </span>
        {t("auth.showcase.badge")}
      </p>

      <h2 className="auth-rise mt-5 max-w-md text-3xl font-semibold leading-tight sm:text-4xl" style={{ animationDelay: "0.12s" }}>
        {t("auth.showcase.title")}
      </h2>
      <p className="auth-rise mt-3 max-w-md text-[15px] leading-relaxed text-white/80" style={{ animationDelay: "0.2s" }}>
        {t("auth.showcase.subtitle")}
      </p>

      <dl className="auth-rise mt-6 flex gap-3" style={{ animationDelay: "0.28s" }}>
        {[
          [data.members, data.members > 1 ? t("auth.showcase.members") : t("auth.showcase.member")],
          [data.articles, data.articles > 1 ? t("auth.showcase.articles") : t("auth.showcase.article")],
        ].map(([value, label]) => (
          <div key={String(label)} className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur">
            <dt className="sr-only">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{fr.format(Number(value))}</dd>
            <dd className="text-xs text-white/75">{label}</dd>
          </div>
        ))}
      </dl>

      {data.headlines.length > 0 && (
        <div className="mt-8 hidden sm:block">
          <p className="auth-rise text-xs font-semibold uppercase tracking-wider text-white/70" style={{ animationDelay: "0.36s" }}>
            {t("auth.showcase.now")}
          </p>
          <ul className="mt-3 space-y-2.5">
            {data.headlines.map((h, i) => (
              <li
                key={h.id}
                className="auth-rise flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 pr-4 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15"
                style={{ animationDelay: `${0.44 + i * 0.08}s` }}
              >
                {h.imageUrl ? (
                  <CoverImage src={h.imageUrl} className="h-12 w-16 shrink-0 rounded-lg" />
                ) : (
                  <span aria-hidden="true" className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-white/15 text-lg">
                    ✦
                  </span>
                )}
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{h.title}</span>
                  {h.url && <span className="text-xs text-white/65">{getDomain(h.url)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
