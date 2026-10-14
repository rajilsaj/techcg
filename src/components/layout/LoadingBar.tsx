"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/*
 * The line under the header becomes a green-yellow-red bar (the Congolese
 * colours) sliding back and forth while something loads: a page after a
 * link click or a filter change, or more stories during infinite scroll.
 */

let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows the bar until the returned function is called. Safe to call the stop twice. */
export function startLoading(): () => void {
  active++;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    active = Math.max(0, active - 1);
    emit();
  };
}

let stopNavigation: (() => void) | null = null;
let navigationTimer: ReturnType<typeof setTimeout> | undefined;

/** A navigation started (link click, router.push): the bar shows until the URL changes. */
export function startNavigation() {
  stopNavigation?.();
  stopNavigation = startLoading();
  // Never spin forever (a navigation that was cancelled or failed).
  clearTimeout(navigationTimer);
  navigationTimer = setTimeout(endNavigation, 15_000);
}

function endNavigation() {
  clearTimeout(navigationTimer);
  stopNavigation?.();
  stopNavigation = null;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * Clicks on same-site links that will change the page start the bar. Listened to
 * in the capture phase: Next.js <Link> cancels the click's default action itself.
 */
function onDocumentClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.search === location.search) return; // same page or a #hash
  startNavigation();
}

/** Ends the navigation once the new URL is in place. */
function RouteWatcher() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  useEffect(() => {
    endNavigation();
  }, [pathname, search]);
  return null;
}

export function LoadingBar() {
  const loading = useSyncExternalStore(
    subscribe,
    () => active > 0,
    () => false
  );

  useEffect(() => {
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher />
      </Suspense>
      <div
        role="progressbar"
        aria-label="Chargement"
        aria-hidden={!loading}
        className={`pointer-events-none absolute inset-x-0 -bottom-px h-[3px] overflow-hidden transition-opacity duration-300 ${
          loading ? "opacity-100" : "opacity-0"
        }`}
      >
        {loading && <span className="loading-bar block h-full w-2/5" />}
      </div>
    </>
  );
}
