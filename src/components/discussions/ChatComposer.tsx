"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, SendHorizontal } from "lucide-react";
import { submitCommentAction } from "@/app/api/actions/comment";
import { t } from "@/i18n";

/** New messages from others arrive without reloading: the page is refreshed every few seconds while visible. */
const REFRESH_MS = 10_000;

/** The message box's bottom edge (#chat-end, after it) against the bottom of the screen: the latest messages, not the footer. */
const toLatest = (behavior: ScrollBehavior) => document.getElementById("chat-end")?.scrollIntoView({ block: "end", behavior });
const nearLatest = () => (document.getElementById("chat-end")?.getBoundingClientRect().top ?? 0) <= window.innerHeight + 240;

/**
 * Keeps the chat live: refreshes the server-rendered messages, opens at the
 * latest one, and follows new ones when the reader is already at the bottom.
 */
export function ChatLive({ count }: { count: number }) {
  const router = useRouter();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const first = previous.current === null;
    if (first || (count > (previous.current ?? 0) && nearLatest())) toLatest(first ? "auto" : "smooth");
    previous.current = count;
  }, [count]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}

const barClass =
  "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 -mx-4 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:bottom-0 md:pb-5";

/** The message box at the bottom of a conversation (Enter sends, Shift+Enter adds a line). */
export function ChatComposer({ threadId, isLoggedIn }: { threadId: number; isLoggedIn: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  // Grows with the text, up to about six lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  if (!isLoggedIn) {
    const next = encodeURIComponent(`/discussions/${threadId}`);
    return (
      <div className={barClass}>
        <div className="flex items-center justify-between gap-3 rounded-full bg-bg-secondary py-1.5 pl-4 pr-1.5">
          <p className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
            <LockKeyhole size={15} aria-hidden className="shrink-0" />
            <span className="truncate">{t("discussions.loginTitle")}</span>
          </p>
          <span className="flex shrink-0 items-center gap-2">
            <Link href={`/inscription?next=${next}`} className="hidden text-sm text-text-secondary hover:text-accent sm:inline">
              {t("discussions.register")}
            </Link>
            <Link href={`/connexion?next=${next}`} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:no-underline hover:opacity-90">
              {t("discussions.login")}
            </Link>
          </span>
        </div>
      </div>
    );
  }

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await submitCommentAction(threadId, message);
      if (result.error) {
        setError(result.error);
        return;
      }
      setText("");
      if (result.pending) setNotice(t("discussions.pending"));
      router.refresh();
      // Follow my own message once it is rendered.
      setTimeout(() => toLatest("smooth"), 400);
    } finally {
      setSending(false);
      box.current?.focus();
    }
  };

  return (
    <form
      className={barClass}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {(error || notice) && (
        <p role={error ? "alert" : "status"} className={`mb-2 text-sm ${error ? "text-red-600 dark:text-red-400" : "text-text-secondary"}`}>
          {error || notice}
        </p>
      )}
      <div className="flex items-end gap-2 rounded-3xl bg-bg-secondary p-1.5 pl-4 focus-within:ring-2 focus-within:ring-accent/40">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("discussions.placeholder")}</span>
          <textarea
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={10000}
            enterKeyHint="send"
            placeholder={t("discussions.placeholder")}
            title={t("discussions.sendHint")}
            className="block max-h-40 w-full resize-none border-0 bg-transparent py-2 text-[15px] text-text shadow-none placeholder:text-text-secondary/70 focus:outline-none focus:ring-0"
          />
        </label>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label={sending ? t("discussions.sending") : t("discussions.send")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal size={18} aria-hidden />
        </button>
      </div>
    </form>
  );
}
