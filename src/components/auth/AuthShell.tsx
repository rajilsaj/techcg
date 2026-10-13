"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SITE } from "@/lib/site";
import { describeAuthError, signInWithGoogle } from "@/lib/firebase-auth";
import { establishSession } from "@/lib/session-client";
import { Alert } from "./Alert";
import { AuthFrame } from "./AuthFrame";
import { GoogleButton } from "./GoogleButton";
import { t } from "@/i18n";

type Intent = "signin" | "signup";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/** Sign-in / sign-up screen: Google only. A first sign-in creates the account. */
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

  return (
    <AuthFrame>
      <h1 className="text-2xl font-bold tracking-tight text-text">
        {intent === "signup" ? t("auth.landing.titleSignup", { site: SITE.name }) : t("auth.landing.titleSignin")}
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{t("auth.landing.subtitle")}</p>

      <div className="mt-7 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <GoogleButton onClick={signIn} loading={busy} disabled={busy} />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-text-secondary">{t("auth.landing.autoCreate")}</p>
    </AuthFrame>
  );
}
