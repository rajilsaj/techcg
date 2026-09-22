"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { completeMagicLink, describeAuthError } from "@/lib/firebase-auth";
import { establishSession } from "@/lib/session-client";
import { Alert } from "./Alert";
import { AuthFrame } from "./AuthFrame";
import { PrimaryButton, Spinner } from "./Button";

type State = "working" | "need-email" | "error" | "done";

export function MagicLinkComplete() {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (emailOverride?: string) => {
      setState("working");
      setError(null);
      try {
        const user = await completeMagicLink(emailOverride);
        if (!user) {
          setError("This page only works when opened from a sign-in link we emailed you.");
          setState("error");
          return;
        }
        await establishSession(user);
        setState("done");
        router.replace("/");
        router.refresh();
      } catch (e) {
        if ((e as { code?: string })?.code === "auth/missing-email") {
          setState("need-email");
          return;
        }
        setError(describeAuthError(e));
        setState(emailOverride ? "need-email" : "error");
      }
    },
    [router]
  );

  useEffect(() => {
    run();
  }, [run]);

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    run(email);
  };

  return (
    <AuthFrame
      viewKey={state}
      footer={
        state === "error" ? (
          <Link href="/recover" className="font-medium">
            Request a new link
          </Link>
        ) : null
      }
    >
      {state === "working" || state === "done" ? (
        <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
          <Spinner className="h-6 w-6 text-accent" />
          <p className="mt-4 text-[15px] text-text-secondary">
            {state === "done" ? "Signed in. Taking you home…" : "Confirming your sign-in link…"}
          </p>
        </div>
      ) : state === "need-email" ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-text">Confirm your email</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">
            Looks like you opened this link on a different device. Enter the email address you
            requested it with to finish signing in.
          </p>
          <form onSubmit={submitEmail} className="mt-6 space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <div>
              <label htmlFor="ml-email" className="mb-1.5 block text-sm font-medium text-text">
                Email address
              </label>
              <input
                id="ml-email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] text-text placeholder:text-text-secondary/60"
              />
            </div>
            <PrimaryButton
              type="submit"
              disabled={!email.includes("@")}
              icon={<Mail size={16} aria-hidden="true" />}
            >
              Finish signing in
            </PrimaryButton>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-text">Link didn&apos;t work</h1>
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        </>
      )}
    </AuthFrame>
  );
}
