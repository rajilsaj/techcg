"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
}: {
  intent?: Intent;
  initialView?: AuthView;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = safeNext(params.get("next"));

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
        setError(e instanceof Error ? e.message : "Couldn't complete sign-in.");
        setPhase("idle");
      }
    },
    [router, nextPath]
  );

  const handleGoogle = async () => {
    setError(null);
    setPhase("google");
    try {
      await finish(await signInWithGoogle());
    } catch (e) {
      setError(describeAuthError(e));
      setPhase("idle");
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setPhoneTouched(true);
    if (!phoneValid) {
      setError("Enter a valid phone number, including the right country code.");
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
      setError(describeAuthError(err));
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
      setError(describeAuthError(err));
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
      setError(describeAuthError(err));
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
              Back to sign in
            </LinkButton>
          ) : view === "landing" ? (
            <>
              Trouble signing in?{" "}
              <LinkButton onClick={() => go("recovery")}>Get help</LinkButton>
            </>
          ) : null
        }
      >
        {/* ---------- Landing ---------- */}
        {view === "landing" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              {intent === "signup" ? `Join ${SITE.name}` : "Welcome back"}
            </h1>
            <p className={sub}>
              No passwords here. Continue with Google, or we&apos;ll text you a code.
            </p>

            <div className="mt-7 space-y-5">
              {error && <Alert tone="error">{error}</Alert>}

              <GoogleButton onClick={handleGoogle} loading={phase === "google"} disabled={busy} />

              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-secondary">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                or
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
                  loadingLabel="Sending code…"
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  Text me a code
                </PrimaryButton>
              </form>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-text-secondary">
              New here? Signing in creates your account automatically.
            </p>
          </>
        )}

        {/* ---------- OTP ---------- */}
        {view === "otp" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} id="otp-heading" className={heading}>
              Check your phone
            </h1>
            <p id="otp-description" className={sub}>
              Enter the 6-digit code we sent to{" "}
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
                    document.querySelectorAll<HTMLInputElement>('[aria-label^="Digit "]')
                  )
                    .map((el) => el.value)
                    .join("");
                  verifyCode(code);
                }}
                loading={phase === "verifying" || phase === "finishing"}
                loadingLabel={phase === "finishing" ? "Signing you in…" : "Verifying…"}
                disabled={busy}
                icon={<ArrowRight size={16} aria-hidden="true" />}
              >
                Verify
              </PrimaryButton>

              <div className="flex items-center justify-between text-sm">
                <LinkButton onClick={() => sendCode()} disabled={busy || resendIn > 0}>
                  <RefreshCw size={13} className="mr-1 inline" aria-hidden="true" />
                  {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, "0")}` : "Resend code"}
                </LinkButton>
                <LinkButton onClick={() => go("landing")} disabled={busy}>
                  Change number
                </LinkButton>
              </div>
            </div>
          </>
        )}

        {/* ---------- Recovery / account linker ---------- */}
        {view === "recovery" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              Can&apos;t get in?
            </h1>
            <p className={sub}>
              {SITE.name} accounts don&apos;t have passwords, so there&apos;s nothing to reset.
              Pick the option that matches how you joined.
            </p>

            <div className="mt-7 space-y-6">
              {error && <Alert tone="error">{error}</Alert>}

              <section aria-labelledby="rec-google">
                <h2 id="rec-google" className="mb-2 text-sm font-semibold text-text">
                  I signed up with Gmail
                </h2>
                <GoogleButton
                  onClick={handleGoogle}
                  loading={phase === "google"}
                  disabled={busy}
                />
              </section>

              <section aria-labelledby="rec-email">
                <h2 id="rec-email" className="mb-2 text-sm font-semibold text-text">
                  I lost access to my phone number
                </h2>
                {emailSentTo ? (
                  <Alert tone="success">
                    We sent a sign-in link to <strong>{emailSentTo}</strong>. It expires in about
                    an hour.{" "}
                    <LinkButton
                      className="!text-inherit underline"
                      onClick={() => {
                        setEmailSentTo(null);
                        setEmail("");
                      }}
                    >
                      Use a different email
                    </LinkButton>
                  </Alert>
                ) : (
                  <form onSubmit={sendEmailLink} className="space-y-3">
                    <label htmlFor="rec-email-input" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="rec-email-input"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <SecondaryButton
                      type="submit"
                      loading={phase === "emailing"}
                      loadingLabel="Sending link…"
                      disabled={busy || !email.includes("@")}
                      icon={<Mail size={16} aria-hidden="true" />}
                    >
                      Email me a sign-in link
                    </SecondaryButton>
                  </form>
                )}
              </section>

              <section aria-labelledby="rec-phone">
                <h2 id="rec-phone" className="mb-2 text-sm font-semibold text-text">
                  I have a new phone number
                </h2>
                <SecondaryButton
                  onClick={() => go("landing")}
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  Sign in with a different number
                </SecondaryButton>
              </section>

              <details className="group rounded-lg border border-border bg-bg-secondary/60 px-3.5 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-text">
                  <LifeBuoy size={15} className="text-accent" aria-hidden="true" />
                  Why isn&apos;t there a password?
                </summary>
                <p className="mt-2 leading-relaxed text-text-secondary">
                  Your Google account or phone number already proves it&apos;s you, so we never
                  store a password that could be leaked or forgotten. If none of the options
                  above work, sign in with Google to start fresh.
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
