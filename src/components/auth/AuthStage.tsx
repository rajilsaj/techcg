"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Rocket, Sparkles, UserRound } from "lucide-react";
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

/** One round "app" in the cluster, gently floating. Positions are % of the cluster box. */
function Bubble({ x, y, size, delay = 0, className = "", children }: { x: number; y: number; size: number; delay?: number; className?: string; children?: ReactNode }) {
  const style: CSSProperties = { left: `${x}%`, top: `${y}%`, width: `${size}%` };
  return (
    // The float animation sits on the inner circle so it doesn't undo the centring transform.
    <div className="absolute aspect-square -translate-x-1/2 -translate-y-1/2" style={style}>
      <div
        className={`auth-float grid h-full w-full place-items-center overflow-hidden rounded-full shadow-[0_12px_30px_rgba(0,0,0,0.45)] ${className}`}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </div>
    </div>
  );
}

export interface StageImage {
  id: number;
  imageUrl: string;
}

/**
 * Sign-in / sign-up screen in the style of iCloud's: a cluster of round "apps"
 * around the site's mark, the wordmark, and a single pill button (Google sign-in).
 */
export function AuthStage({
  intent,
  next,
  weekday,
  day,
  images,
}: {
  intent: Intent;
  next: string | null;
  /** Today's short weekday and day of month, computed on the server ("LUN", "13"). */
  weekday: string;
  day: string;
  /** Covers of current articles, shown in two bubbles. */
  images: StageImage[];
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
  const [first, second] = images;

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center bg-[#1c1c1e] px-4 py-10 text-white">
      {/* The cluster */}
      <div className="auth-rise relative aspect-[10/9] w-full max-w-[22rem]" aria-hidden="true">
        {/* Radar: what's happening around you */}
        <Bubble x={50} y={9} size={22} delay={0.4} className="bg-[#2c2c2e]">
          <div className="grid h-[78%] w-[78%] place-items-center rounded-full bg-[radial-gradient(circle,#34c759_0%,#30b350_45%,#1f7a37_100%)]">
            <div className="grid h-[42%] w-[42%] place-items-center rounded-full bg-white">
              <div className="h-[62%] w-[62%] rounded-full bg-accent" />
            </div>
          </div>
        </Bubble>

        {/* Calendar: events */}
        <Bubble x={22} y={33} size={36} delay={1.1} className="bg-[#2c2c2e]">
          <div className="text-center leading-none">
            <p className="text-[clamp(0.8rem,4vw,1.2rem)] font-semibold tracking-wide text-[#ff453a]">{weekday}</p>
            <p className="mt-1 text-[clamp(2.2rem,12vw,3.6rem)] font-light">{day}</p>
          </div>
        </Bubble>

        {/* AI */}
        <Bubble x={9} y={56} size={13} delay={2} className="bg-gradient-to-br from-[#5ac8fa] to-accent">
          <Sparkles className="h-1/2 w-1/2" />
        </Bubble>

        {/* Entrepreneurs */}
        <Bubble x={23} y={70} size={19} delay={0.8} className="bg-[#2c2c2e]">
          <Rocket className="h-1/2 w-1/2 text-[#ff9f0a]" />
        </Bubble>

        {/* Community */}
        <Bubble x={81} y={27} size={20} delay={1.6} className="bg-[#2c2c2e]">
          <UserRound className="h-[55%] w-[55%] text-[#8e8e93]" />
        </Bubble>

        {/* Article covers (or a colour wheel when there are none yet) */}
        <Bubble x={84} y={57} size={30} delay={0.2} className="bg-[conic-gradient(from_0deg,#ff453a,#ff9f0a,#ffd60a,#30d158,#64d2ff,#0a84ff,#bf5af2,#ff375f,#ff453a)]">
          {first && (
            // eslint-disable-next-line @next/next/no-img-element -- third-party article cover
            <img src={first.imageUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </Bubble>
        <Bubble x={52} y={89} size={24} delay={1.3} className="bg-[radial-gradient(circle_at_30%_30%,#ff375f_0_8%,transparent_9%),radial-gradient(circle_at_65%_25%,#ffd60a_0_8%,transparent_9%),radial-gradient(circle_at_45%_60%,#30d158_0_8%,transparent_9%),radial-gradient(circle_at_75%_65%,#0a84ff_0_8%,transparent_9%),radial-gradient(circle_at_25%_75%,#bf5af2_0_8%,transparent_9%),#fdf6e3]">
          {second && (
            // eslint-disable-next-line @next/next/no-img-element -- third-party article cover
            <img src={second.imageUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </Bubble>

        {/* Conversations */}
        <Bubble x={74} y={83} size={13} delay={2.4} className="bg-[#30d158]">
          <MessageCircle className="h-1/2 w-1/2 fill-white text-white" />
        </Bubble>

        {/* The site's mark, in the middle */}
        <Bubble x={51} y={50} size={50} delay={0} className="bg-gradient-to-br from-[#e8f0ff] to-[#bcd3ff] ring-[6px] ring-[#1c1c1e]">
          <span className="flex h-[52%] w-[52%] items-center justify-center rounded-[22%] border-[5px] border-[#1c1c1e] text-[clamp(2.5rem,13vw,4.5rem)] font-bold leading-none text-accent">
            T
          </span>
        </Bubble>
      </div>

      {/* Wordmark */}
      <h1 className="auth-rise mt-6 text-[clamp(4.5rem,22vw,9rem)] font-semibold leading-none tracking-tighter" style={{ animationDelay: "0.1s" }}>
        Tech<span className="text-accent">.</span>cg
      </h1>
      <p className="auth-rise mt-4 max-w-sm text-center text-base text-[#a1a1a6]" style={{ animationDelay: "0.2s" }}>
        {signup ? t("auth.stage.subtitleSignup") : t("auth.stage.subtitle")}
      </p>

      <div className="auth-rise mt-8 flex flex-col items-center gap-3" style={{ animationDelay: "0.3s" }}>
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="inline-flex h-14 min-w-[11rem] items-center justify-center gap-2 rounded-full bg-white px-10 text-lg font-semibold text-[#1d1d1f] transition hover:scale-[1.03] hover:bg-[#f5f5f7] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/60 disabled:cursor-wait disabled:opacity-80"
        >
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-[#1d1d1f]" aria-hidden="true" />}
          {busy ? t("auth.googleOpening") : signup ? t("auth.stage.signup") : t("auth.stage.signin")}
        </button>
        <p className="inline-flex items-center gap-1.5 text-xs text-[#86868b]">
          <GoogleGlyph />
          {t("auth.stage.withGoogle")}
        </p>
        {error && (
          <p role="alert" className="auth-view max-w-sm text-center text-sm text-[#ff6961]">
            {error}
          </p>
        )}
      </div>

      <p className="auth-rise mt-10 text-sm text-[#86868b]" style={{ animationDelay: "0.4s" }}>
        {signup ? t("auth.card.haveAccount") : t("auth.card.noAccount")}{" "}
        <Link href={next ? `${other}?next=${encodeURIComponent(next)}` : other} className="font-medium text-[#2997ff] hover:underline">
          {signup ? t("auth.card.toSignin") : t("auth.card.toSignup")}
        </Link>
      </p>
    </div>
  );
}
