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
        setError(e instanceof Error ? e.message : "Impossible de finaliser la connexion.");
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
      setError("Saisissez un numéro de téléphone valide, avec le bon indicatif pays.");
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
              Retour à la connexion
            </LinkButton>
          ) : view === "landing" ? (
            <>
              Un problème pour vous connecter ?{" "}
              <LinkButton onClick={() => go("recovery")}>Obtenir de l&apos;aide</LinkButton>
            </>
          ) : null
        }
      >
        {/* ---------- Landing ---------- */}
        {view === "landing" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              {intent === "signup" ? `Rejoindre ${SITE.name}` : "Bon retour"}
            </h1>
            <p className={sub}>
              Pas de mot de passe ici. Continuez avec Google, ou recevez un code par SMS.
            </p>

            <div className="mt-7 space-y-5">
              {error && <Alert tone="error">{error}</Alert>}

              <GoogleButton onClick={handleGoogle} loading={phase === "google"} disabled={busy} />

              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-text-secondary">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                ou
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
                  loadingLabel="Envoi du code…"
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  Recevoir un code par SMS
                </PrimaryButton>
              </form>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-text-secondary">
              Nouveau ici ? La connexion crée votre compte automatiquement.
            </p>
          </>
        )}

        {/* ---------- OTP ---------- */}
        {view === "otp" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} id="otp-heading" className={heading}>
              Vérifiez votre téléphone
            </h1>
            <p id="otp-description" className={sub}>
              Saisissez le code à 6 chiffres envoyé au{" "}
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
                    document.querySelectorAll<HTMLInputElement>('[aria-label^="Chiffre "]')
                  )
                    .map((el) => el.value)
                    .join("");
                  verifyCode(code);
                }}
                loading={phase === "verifying" || phase === "finishing"}
                loadingLabel={phase === "finishing" ? "Connexion…" : "Vérification…"}
                disabled={busy}
                icon={<ArrowRight size={16} aria-hidden="true" />}
              >
                Vérifier
              </PrimaryButton>

              <div className="flex items-center justify-between text-sm">
                <LinkButton onClick={() => sendCode()} disabled={busy || resendIn > 0}>
                  <RefreshCw size={13} className="mr-1 inline" aria-hidden="true" />
                  {resendIn > 0 ? `Renvoyer dans 0:${String(resendIn).padStart(2, "0")}` : "Renvoyer le code"}
                </LinkButton>
                <LinkButton onClick={() => go("landing")} disabled={busy}>
                  Changer de numéro
                </LinkButton>
              </div>
            </div>
          </>
        )}

        {/* ---------- Recovery / account linker ---------- */}
        {view === "recovery" && (
          <>
            <h1 ref={headingRef} tabIndex={-1} className={heading}>
              Impossible de vous connecter ?
            </h1>
            <p className={sub}>
              Les comptes {SITE.name} n&apos;ont pas de mot de passe, il n&apos;y a donc rien à
              réinitialiser. Choisissez l&apos;option qui correspond à votre inscription.
            </p>

            <div className="mt-7 space-y-6">
              {error && <Alert tone="error">{error}</Alert>}

              <section aria-labelledby="rec-google">
                <h2 id="rec-google" className="mb-2 text-sm font-semibold text-text">
                  Je me suis inscrit avec Gmail
                </h2>
                <GoogleButton
                  onClick={handleGoogle}
                  loading={phase === "google"}
                  disabled={busy}
                />
              </section>

              <section aria-labelledby="rec-email">
                <h2 id="rec-email" className="mb-2 text-sm font-semibold text-text">
                  Je n&apos;ai plus accès à mon numéro de téléphone
                </h2>
                {emailSentTo ? (
                  <Alert tone="success">
                    Nous avons envoyé un lien de connexion à <strong>{emailSentTo}</strong>. Il
                    expire dans environ une heure.{" "}
                    <LinkButton
                      className="!text-inherit underline"
                      onClick={() => {
                        setEmailSentTo(null);
                        setEmail("");
                      }}
                    >
                      Utiliser une autre adresse
                    </LinkButton>
                  </Alert>
                ) : (
                  <form onSubmit={sendEmailLink} className="space-y-3">
                    <label htmlFor="rec-email-input" className="sr-only">
                      Adresse e-mail
                    </label>
                    <input
                      id="rec-email-input"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      placeholder="vous@exemple.com"
                      className="w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <SecondaryButton
                      type="submit"
                      loading={phase === "emailing"}
                      loadingLabel="Envoi du lien…"
                      disabled={busy || !email.includes("@")}
                      icon={<Mail size={16} aria-hidden="true" />}
                    >
                      M&apos;envoyer un lien de connexion
                    </SecondaryButton>
                  </form>
                )}
              </section>

              <section aria-labelledby="rec-phone">
                <h2 id="rec-phone" className="mb-2 text-sm font-semibold text-text">
                  J&apos;ai un nouveau numéro de téléphone
                </h2>
                <SecondaryButton
                  onClick={() => go("landing")}
                  disabled={busy}
                  icon={<Smartphone size={16} aria-hidden="true" />}
                >
                  Se connecter avec un autre numéro
                </SecondaryButton>
              </section>

              <details className="group rounded-lg border border-border bg-bg-secondary/60 px-3.5 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-text">
                  <LifeBuoy size={15} className="text-accent" aria-hidden="true" />
                  Pourquoi n&apos;y a-t-il pas de mot de passe ?
                </summary>
                <p className="mt-2 leading-relaxed text-text-secondary">
                  Votre compte Google ou votre numéro de téléphone prouve déjà votre identité,
                  nous ne stockons donc jamais de mot de passe susceptible de fuiter ou
                  d&apos;être oublié. Si aucune des options ci-dessus ne fonctionne,
                  connectez-vous avec Google pour repartir de zéro.
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
