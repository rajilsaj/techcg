"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Per-tab session id: a "visit" is everything one tab does until it's closed. */
function sessionId(): string {
  try {
    let id = sessionStorage.getItem("sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("sid", id);
    }
    return id;
  } catch {
    return "nostorage";
  }
}

/**
 * Reports each real page view to /api/track (link prefetches aren't counted),
 * then the time spent on it when the visitor navigates away or leaves.
 * Admin pages are never tracked.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const current = useRef<{ id: number; start: number } | null>(null);
  const firstView = useRef(true);

  useEffect(() => {
    const leave = () => {
      const view = current.current;
      if (!view) return;
      current.current = null;
      const body = JSON.stringify({ type: "leave", id: view.id, durationMs: Date.now() - view.start });
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
        fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") leave();
    };
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/godmod")) return;

    // Close the previous page's view before recording this one.
    const previous = current.current;
    if (previous) {
      current.current = null;
      const body = JSON.stringify({ type: "leave", id: previous.id, durationMs: Date.now() - previous.start });
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }

    const start = Date.now();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "view",
        path: pathname,
        // Only the first page of a visit has an external referrer.
        referrer: firstView.current ? document.referrer : null,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sessionId: sessionId(),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id?: number } | null) => {
        if (data?.id) current.current = { id: data.id, start };
      })
      .catch(() => {});
    firstView.current = false;
  }, [pathname]);

  return null;
}
