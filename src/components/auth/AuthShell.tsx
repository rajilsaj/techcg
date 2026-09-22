"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult, User } from "firebase/auth";
import { ArrowLeft, ArrowRight, LifeBuoy, Mail, RefreshCw, Smartphone } from "lucide-react";
import { SITE } from "@/lib/site";
import {
  confirmPhoneCode,
  describeAuthError,
  sendMagicLink,
  signInWithGoogle,
  startPhoneSignIn,
} from "@/lib/firebase-auth";
import { establishSession } from "@/lib/session-client";
import { useT } from "@/i18n/client";
import { Alert } from "./Alert";
import { AuthFrame } from "./AuthFrame";
import { LinkButton, PrimaryButton, SecondaryButton } from "./Button";
import { GoogleButton } from "./GoogleButton";
import { OtpInput } from "./OtpInput";
import { COUNTRIES, PhoneField, isValidNational, toE164, type Country } from "./PhoneField";

export type AuthView = "landing" | "otp" | "recovery";
type Intent = "signin" | "signup";
type Phase = "idle" | "google" | "sending" | "verifying" | "finishing" | "emailing";

const RESEND_SECONDS = 30;
const RECAPTCHA_ID = "auth-recaptcha";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AuthShell({
  intent = "signin",
  initialView = "landing",
  next = null,
}: {
  intent?: Intent;
  initialView?: AuthView;
  /** Relative path to return to after sign-in (from `?next=`). */
  next?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const nextPath = safeNext(next);

  const [view, setView] = useState<AuthView>(initialView);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [national, setNational] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [otpInvalid, setOtpInvalid] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [email, setEmail] = useState("");
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle";
  const phoneValid = isValidNational(national);
  const phoneDisplay = `+${country.dial} ${national.trim()}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const go = useCallback((next: AuthView) => {
    setError(null);
    setOtpInvalid(false);
    setView(next);
  }, []);

  const finish = useCallback(
    async (user: User) => {
      setPhase("finishing");
      try {
        await establishSession(user);
        router.replace(nextPath);
        router.refresh();
      } catch (e) {
        setError((e instanceof Error && e.message) || t("auth.finishFailed"));
        setPhase("idle");
      }
    },
    [router, nextPath, t]
  );

  const handleGoogle = async () => {
    setError(null);
    setPhase("google");
    try {
      await finish(await signInWithGoogle());
    } catch (e) {
      setError(describeAuthError(e, t));
      setPhase("idle");
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setPhoneTouched(true);
    if (!phoneValid) {
      setError(t("auth.invalidPhone"));
      phoneRef.current?.focus();
      return;
    }
    setError(null);
    setPhase("sending");
    try {
      confirmationRef.current = await startPhoneSignIn(toE164(country, national), RECAPTCHA_ID);
      setOtpKey((k) => k + 1);
      setOtpInvalid(false);
      setResendIn(RESEND_SECONDS);
      setView("otp");
    } catch (err) {
      setError(describeAuthError(err, t));
    } finally {
      setPhase("idle");
    }
  };

  const verifyCode = async (code: string) => {
    if (!confirmationRef.current || code.length !== 6 || busy) return;
    setError(null);
    setOtpInvalid(false);
    setPhase("verifying");
    try {
      await finish(await confirmPhoneCode(confirmationRef.current, code));
    } catch (err) {
      setError(describeAuthError(err, t));
      setOtpInvalid(true);
      setOtpKey((k) => k + 1);
      setPhase("idle");
    }
  };

  const sendEmailLink = async (e: FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    setError(null);
    setPhase("emailing");
    try {
      await sendMagicLink(target);
      setEmailSentTo(target);
    } catch (err) {
      setError(describeAuthError(err, t));
    } finally {
      setPhase("idle");
    }
  };

  const heading = "text-2xl font-bold tracking-tight text-text outline-none";
  const sub = "mt-1.5 text-[15px] leading-relaxed text-text-secondary";

  return (
    <>
      <AuthFrame
        viewKey={view}
        footer={
          view === "recovery" ? (
            <LinkButton onClick={() => go("landing")}>
              <ArrowLeft size={14} className="mr-1 inline" aria-hidden="true" />
              {t("auth.backToSignin")}
            </LinkButton>
          ) : view === "landing" ? (
            <>
              {t("auth.trouble")}{" "}
              <LinkButton onClick={() => go("recovery")}>{t("auth.getHelp")}</LinkButton>
            </>
          ) : null
        }
      >
        {/* ---------- Landing ---------- */}
        {view === "landing" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              {intent === "signup"
                ? t("auth.landing.titleSignup", { site: SITE.name })
                : t("auth.landing.titleSignin")}
            </h1>
            <p className={sub}>{t("auth.landing.subtitle")}</p>

            <div className="mt-7 space-y-5">
              {error && <Alert tone="error">{error}</Alert>}

              <GoogleButton onClick={handleGoogle} loading={phase === "google"} disabled={busy} />

              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-secondary">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                {t("auth.or")}
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>

              <form onSubmit={sendCode} noValidate className="space-y-4">
                <PhoneField
                  ref={phoneRef}
                  id="auth-phone"
                  country={country}
                  onCountryChange={setCountry}
                  value={national}
                  onChange={(v) => {
                    setNational(v);
                    if (error) setError(null);
                  }}
                  disabled={busy}
                  invalid={phoneTouched && !phoneValid && national.length > 0}
                  describedBy="auth-phone-hint"
                />
                <PrimaryButton
                  type="submit"
                  loading={phase === "sending"}
                  loadingLabel={t("auth.landing.sendingCode")}
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  {t("auth.landing.sendCode")}
                </PrimaryButton>
              </form>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-text-secondary">
              {t("auth.landing.autoCreate")}
            </p>
          </>
        )}

        {/* ---------- OTP ---------- */}
        {view === "otp" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} id="otp-heading" className={heading}>
              {t("auth.otp.title")}
            </h1>
            <p id="otp-description" className={sub}>
              {t("auth.otp.sentTo")}{" "}
              <span className="font-medium text-text tabular-nums">{phoneDisplay}</span>.
            </p>

            <div className="mt-7 space-y-5">
              {error && <Alert tone="error">{error}</Alert>}

              <OtpInput
                key={otpKey}
                labelledBy="otp-heading"
                describedBy="otp-description"
                onComplete={verifyCode}
                disabled={busy}
                invalid={otpInvalid}
              />

              <PrimaryButton
                onClick={() => {
                  const code = Array.from(
                    document.querySelectorAll<HTMLInputElement>("[data-otp-cell]")
                  )
                    .map((el) => el.value)
                    .join("");
                  verifyCode(code);
                }}
                loading={phase === "verifying" || phase === "finishing"}
                loadingLabel={phase === "finishing" ? t("auth.otp.signingIn") : t("auth.otp.verifying")}
                disabled={busy}
                icon={<ArrowRight size={16} aria-hidden="true" />}
              >
                {t("auth.otp.verify")}
              </PrimaryButton>

              <div className="flex items-center justify-between text-sm">
                <LinkButton onClick={() => sendCode()} disabled={busy || resendIn > 0}>
                  <RefreshCw size={13} className="mr-1 inline" aria-hidden="true" />
                  {resendIn > 0
                    ? t("auth.otp.resendIn", { time: `0:${String(resendIn).padStart(2, "0")}` })
                    : t("auth.otp.resend")}
                </LinkButton>
                <LinkButton onClick={() => go("landing")} disabled={busy}>
                  {t("auth.otp.changeNumber")}
                </LinkButton>
              </div>
            </div>
          </>
        )}

        {/* ---------- Recovery / account linker ---------- */}
        {view === "recovery" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              {t("auth.recovery.title")}
            </h1>
            <p className={sub}>{t("auth.recovery.subtitle", { site: SITE.name })}</p>

            <div className="mt-7 space-y-6">
              {error && <Alert tone="error">{error}</Alert>}

              <section aria-labelledby="rec-google">
                <h2 id="rec-google" className="mb-2 text-sm font-semibold text-text">
                  {t("auth.recovery.google")}
                </h2>
                <GoogleButton
                  onClick={handleGoogle}
                  loading={phase === "google"}
                  disabled={busy}
                />
              </section>

              <section aria-labelledby="rec-email">
                <h2 id="rec-email" className="mb-2 text-sm font-semibold text-text">
                  {t("auth.recovery.lostPhone")}
                </h2>
                {emailSentTo ? (
                  <Alert tone="success">
                    {t("auth.recovery.linkSentBefore")} <strong>{emailSentTo}</strong>
                    {t("auth.recovery.linkSentAfter")}{" "}
                    <LinkButton
                      className="!text-inherit underline"
                      onClick={() => {
                        setEmailSentTo(null);
                        setEmail("");
                      }}
                    >
                      {t("auth.recovery.useOtherEmail")}
                    </LinkButton>
                  </Alert>
                ) : (
                  <form onSubmit={sendEmailLink} className="space-y-3">
                    <label htmlFor="rec-email-input" className="sr-only">
                      {t("auth.recovery.emailLabel")}
                    </label>
                    <input
                      id="rec-email-input"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      placeholder={t("auth.recovery.emailPlaceholder")}
                      className="w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <SecondaryButton
                      type="submit"
                      loading={phase === "emailing"}
                      loadingLabel={t("auth.recovery.sendingLink")}
                      disabled={busy || !email.includes("@")}
                      icon={<Mail size={16} aria-hidden="true" />}
                    >
                      {t("auth.recovery.sendLink")}
                    </SecondaryButton>
                  </form>
                )}
              </section>

              <section aria-labelledby="rec-phone">
                <h2 id="rec-phone" className="mb-2 text-sm font-semibold text-text">
                  {t("auth.recovery.newPhone")}
                </h2>
                <SecondaryButton
                  onClick={() => go("landing")}
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  {t("auth.recovery.otherNumber")}
                </SecondaryButton>
              </section>

              <details className="group rounded-lg border border-border bg-bg-secondary/60 px-3.5 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-text">
                  <LifeBuoy size={15} className="text-accent" aria-hidden="true" />
                  {t("auth.recovery.whyTitle")}
                </summary>
                <p className="mt-2 leading-relaxed text-text-secondary">
                  {t("auth.recovery.whyBody")}
                </p>
              </details>
            </div>
          </>
        )}
      </AuthFrame>

      <div id={RECAPTCHA_ID} aria-hidden="true" />
    </>
  );
}
