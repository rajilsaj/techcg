"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, MousePointerClick, ShieldCheck } from "lucide-react";
import { describeAuthError, signInWithGoogle } from "@/lib/firebase-auth";
import { establishSession } from "@/lib/session-client";
import { Alert } from "./Alert";
import { GoogleButton } from "./GoogleButton";
import { t, type Key } from "@/i18n";

type Intent = "signin" | "signup";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const PROMISES: { icon: typeof KeyRound; key: Key }[] = [
  { icon: KeyRound, key: "auth.promise.noPassword" },
  { icon: MousePointerClick, key: "auth.promise.oneClick" },
  { icon: ShieldCheck, key: "auth.promise.privacy" },
];

/** Sign-in / sign-up card: Google only. A first sign-in creates the account. */
export function AuthShell({
  intent = "signin",
  next = null,
}: {
  intent?: Intent;
  /** Relative path to return to after sign-in (from `?next=`). */
  next?: string | null;
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

  return (
    <div className="auth-rise w-full max-w-sm" style={{ animationDelay: "0.15s" }}>
      <p className="text-sm font-medium text-accent">{signup ? t("auth.card.kickerSignup") : t("auth.card.kickerSignin")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
        {signup ? t("auth.card.titleSignup") : t("auth.card.titleSignin")}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t("auth.landing.subtitle")}</p>

      <div className="mt-8 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="group relative">
          {/* Soft glow behind the one action on the page */}
          <div aria-hidden="true" className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#4285F4]/40 via-[#34A853]/30 to-[#FBBC05]/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative">
            <GoogleButton onClick={signIn} loading={busy} disabled={busy} />
          </div>
        </div>
      </div>

      <ul className="mt-8 space-y-3">
        {PROMISES.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
              <Icon size={15} aria-hidden="true" />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <p className="mt-8 border-t border-border pt-5 text-sm text-text-secondary">
        {signup ? t("auth.card.haveAccount") : t("auth.card.noAccount")}{" "}
        <Link href={next ? `${other}?next=${encodeURIComponent(next)}` : other} className="font-medium text-accent hover:underline">
          {signup ? t("auth.card.toSignin") : t("auth.card.toSignup")}
        </Link>
      </p>
    </div>
  );
}
