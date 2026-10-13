"use client";

import { useEffect, useState } from "react";
import { Clock, Globe, Link2Off, ServerCrash, ShieldAlert, WifiOff, type LucideIcon } from "lucide-react";
import { t, type Key } from "@/i18n";
import type { LinkPreview as Preview, PreviewFailure, PreviewResult } from "@/lib/link-preview";
import { CoverImage } from "@/components/media/CoverImage";

type Failure = PreviewFailure | "rate_limited";
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; preview: Preview }
  | { status: "failed"; reason: Failure; httpStatus?: number };

const DEBOUNCE_MS = 600;

/** Only ask the server about things that already look like a full web address. */
function looksLikeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

// Shared across renders so re-typing a URL already checked doesn't refetch it.
const results = new Map<string, State>();

function useLinkPreview(rawUrl: string): State {
  const url = looksLikeUrl(rawUrl);
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!url) {
      setState({ status: "idle" });
      return;
    }
    const cached = results.get(url);
    if (cached) {
      setState(cached);
      return;
    }

    setState({ status: "loading" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as PreviewResult | { ok: false; reason: Failure };
        if (data.ok) {
          const next: State = { status: "ok", preview: data.preview };
          results.set(url, next);
          setState(next);
        } else if (data.reason === "invalid" || data.reason === ("unauthorized" as Failure)) {
          setState({ status: "idle" });
        } else {
          const next: State = { status: "failed", reason: data.reason, httpStatus: "status" in data ? data.status : undefined };
          if (data.reason !== "rate_limited") results.set(url, next);
          setState(next);
        }
      } catch (err) {
        // Aborted because the user kept typing, or our own endpoint is down: show nothing.
        if ((err as Error).name !== "AbortError") setState({ status: "idle" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  return state;
}

const FAILURES: Record<PreviewFailure, { title: Key; body: Key; tone: "error" | "warning"; icon: LucideIcon }> = {
  not_found: { title: "preview.notFound.title", body: "preview.notFound.body", tone: "error", icon: Link2Off },
  server_error: { title: "preview.serverError.title", body: "preview.serverError.body", tone: "error", icon: ServerCrash },
  timeout: { title: "preview.timeout.title", body: "preview.timeout.body", tone: "error", icon: Clock },
  unreachable: { title: "preview.unreachable.title", body: "preview.unreachable.body", tone: "error", icon: WifiOff },
  restricted: { title: "preview.restricted.title", body: "preview.restricted.body", tone: "warning", icon: ShieldAlert },
  blocked: { title: "preview.blocked.title", body: "preview.blocked.body", tone: "warning", icon: ShieldAlert },
  invalid: { title: "preview.unreachable.title", body: "preview.unreachable.body", tone: "error", icon: WifiOff },
};

export function LinkPreview({ url }: { url: string }) {
  const state = useLinkPreview(url);

  if (state.status === "idle") return null;

  return (
    <div className="mt-3" aria-live="polite">
      {state.status === "loading" && (
        <div className="flex gap-3 rounded-lg border border-border bg-bg-secondary p-3 animate-pulse">
          <div className="h-16 w-24 shrink-0 rounded bg-border" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 rounded bg-border" />
            <div className="h-3 w-1/2 rounded bg-border" />
            <span className="sr-only">{t("preview.loading")}</span>
          </div>
        </div>
      )}

      {state.status === "failed" &&
        (state.reason === "rate_limited" ? (
          <p className="text-xs text-text-secondary">{t("preview.rateLimited")}</p>
        ) : (
          <div
            role="status"
            className={`rounded-lg border border-border border-l-4 bg-bg-secondary p-3 ${
              FAILURES[state.reason].tone === "error" ? "border-l-red-500" : "border-l-amber-500"
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              {(() => {
                const Icon = FAILURES[state.reason].icon;
                return (
                  <Icon
                    size={16}
                    className={FAILURES[state.reason].tone === "error" ? "shrink-0 text-red-500" : "shrink-0 text-amber-500"}
                    aria-hidden
                  />
                );
              })()}
              {t(FAILURES[state.reason].title)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {t(FAILURES[state.reason].body, { status: state.httpStatus ?? "" })}
            </p>
          </div>
        ))}

      {state.status === "ok" && (
        <a
          href={state.preview.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`${t("preview.label")} : ${state.preview.title ?? state.preview.domain}`}
          className="group flex overflow-hidden rounded-lg border border-border bg-bg-secondary transition-colors hover:border-text-secondary"
        >
          {state.preview.image ? (
            <CoverImage src={state.preview.image} className="w-24 shrink-0 self-stretch sm:w-36" />
          ) : (
            <div className="flex w-24 shrink-0 items-center justify-center bg-bg text-text-secondary sm:w-36">
              <Globe className="h-6 w-6" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1 p-3">
            <p className="truncate text-xs text-text-secondary">
              {state.preview.siteName && state.preview.siteName.toLowerCase() !== state.preview.domain
                ? `${state.preview.siteName} · ${state.preview.domain}`
                : state.preview.domain}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-medium text-text group-hover:text-accent">
              {state.preview.title ?? state.preview.url}
            </p>
            {state.preview.description && (
              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{state.preview.description}</p>
            )}
          </div>
        </a>
      )}
    </div>
  );
}
