"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, BrainCircuit, PartyPopper, Rocket } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { describeAuthError, signInWithGoogle } from "@/lib/firebase-auth";
import { establishSession } from "@/lib/session-client";
import { t } from "@/i18n";

type Intent = "signin" | "signup";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** One round "app" in the cluster, gently floating. Positions and size are % of the cluster box. */
function Bubble({ x, y, size, delay = 0, className = "", children }: { x: number; y: number; size: number; delay?: number; className?: string; children?: ReactNode }) {
  const style: CSSProperties = { left: `${x}%`, top: `${y}%`, width: `${size}%` };
  return (
    // The float animation sits on the inner circle so it doesn't undo the centring transform.
    <div className="absolute aspect-square -translate-x-1/2 -translate-y-1/2" style={style}>
      <div
        className={`auth-float flex h-full w-full flex-col items-center justify-center gap-[6%] overflow-hidden rounded-full shadow-lg shadow-accent/10 ${className}`}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Icon + small caption inside a topic bubble. */
function Topic({ icon: Icon, label }: { icon: typeof Rocket; label: string }) {
  return (
    <>
      <Icon className="h-[38%] w-[38%]" strokeWidth={1.75} />
      <span className="max-w-[86%] text-center text-[clamp(0.5rem,2.2vw,0.68rem)] font-semibold leading-none">{label}</span>
    </>
  );
}

/**
 * Sign-in / sign-up screen: a floating cluster of round "apps" (today's date and the
 * site's topics) around the Tech.cg mark, the wordmark, and one pill button (Google).
 * Uses the site's theme colours, so it follows light and dark mode.
 */
export function AuthStage({
  intent,
  next,
  weekday,
  day,
  month,
}: {
  intent: Intent;
  next: string | null;
  /** Today's date, computed on the server ("MAR", "13", "oct."). */
  weekday: string;
  day: string;
  month: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      await establishSession(user);
      router.replace(safeNext(next));
      router.refresh();
    } catch (e) {
      setError(describeAuthError(e, t) || t("auth.finishFailed"));
      setBusy(false);
    }
  };

  const signup = intent === "signup";
  const other = signup ? "/connexion" : "/inscription";
  const soft = "border border-border bg-bg-secondary text-accent";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-clip bg-bg px-4 py-16 text-text">
      {/* No site header here: just a way home and the theme button */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm text-text-secondary transition-colors hover:text-accent">
          ← {t("auth.stage.back")}
        </Link>
        <ThemeToggle />
      </div>

      {/* The cluster */}
      <div className="auth-rise relative aspect-[10/9] w-full max-w-[22rem]" aria-hidden="true">
        {/* Orbits the bubbles seem to travel on */}
        <div className="auth-spin absolute left-1/2 top-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/25" />
        <div className="auth-spin-reverse absolute left-1/2 top-1/2 aspect-square w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/15">
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent" />
          <span className="absolute -bottom-1 left-1/3 h-1.5 w-1.5 rounded-full bg-accent/60" />
        </div>

        {/* Today */}
        <Bubble x={21} y={27} size={34} delay={1.1} className="border border-border bg-bg">
          <p className="text-[clamp(0.7rem,3.4vw,1rem)] font-bold tracking-widest text-accent">{weekday}</p>
          <p className="text-[clamp(2rem,11vw,3.2rem)] font-light leading-none">{day}</p>
          <p className="text-[clamp(0.55rem,2.6vw,0.75rem)] text-text-secondary">{month}</p>
        </Bubble>

        {/* Topics */}
        <Bubble x={81} y={22} size={24} delay={0.3} className="bg-gradient-to-br from-accent to-[#5b9bff] text-white">
          <Topic icon={BrainCircuit} label="IA" />
        </Bubble>
        <Bubble x={87} y={64} size={24} delay={1.8} className={soft}>
          <Topic icon={Rocket} label="Startups" />
        </Bubble>
        <Bubble x={16} y={71} size={29} delay={0.8} className={soft}>
          <Topic icon={Briefcase} label="Entrepreneurs" />
        </Bubble>
        <Bubble x={57} y={91} size={26} delay={2.4} className="bg-accent text-white">
          <Topic icon={PartyPopper} label="Événements" />
        </Bubble>

        {/* The site's mark, in the middle */}
        <Bubble x={51} y={49} size={44} delay={0} className="bg-gradient-to-br from-accent via-[#2f80ff] to-[#7aaeff] ring-[6px] ring-bg">
          <span className="flex h-[52%] w-[52%] items-center justify-center rounded-[22%] border-[5px] border-white text-[clamp(2.2rem,11vw,4rem)] font-bold leading-none text-white">
            T
          </span>
        </Bubble>
      </div>

      {/* Wordmark */}
      <h1 className="auth-rise mt-6 text-[clamp(4.5rem,22vw,9rem)] font-semibold leading-none tracking-tighter" style={{ animationDelay: "0.1s" }}>
        Tech<span className="text-accent">.</span>cg
      </h1>
      <p className="auth-rise mt-4 max-w-sm text-center text-base text-text-secondary" style={{ animationDelay: "0.2s" }}>
        {signup ? t("auth.stage.subtitleSignup") : t("auth.stage.subtitle")}
      </p>

      <div className="auth-rise mt-8 flex flex-col items-center gap-3" style={{ animationDelay: "0.3s" }}>
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-full bg-accent px-10 text-lg font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.03] hover:opacity-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-80"
        >
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
          {busy ? t("auth.googleOpening") : signup ? t("auth.stage.signup") : t("auth.stage.signin")}
        </button>
        <p className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <GoogleGlyph />
          {t("auth.stage.withGoogle")}
        </p>
        {error && (
          <p role="alert" className="auth-view max-w-sm text-center text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      <p className="auth-rise mt-10 text-sm text-text-secondary" style={{ animationDelay: "0.4s" }}>
        {signup ? t("auth.card.haveAccount") : t("auth.card.noAccount")}{" "}
        <Link href={next ? `${other}?next=${encodeURIComponent(next)}` : other} className="font-medium text-accent hover:underline">
          {signup ? t("auth.card.toSignin") : t("auth.card.toSignup")}
        </Link>
      </p>
    </div>
  );
}
