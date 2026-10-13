"use client";

import { useEffect } from "react";

/** Registers the service worker (production only, so development always sees fresh code). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not critical: the site works without it.
    });
  }, []);
  return null;
}

/** Forgets pages saved for offline reading (they show the signed-in header). Called on logout. */
export async function clearOfflinePages(): Promise<void> {
  try {
    for (const name of (await caches.keys()).filter((key) => key.startsWith("pages-"))) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname !== "/offline.html") await cache.delete(request);
      }
    }
  } catch {
    // No Cache API (old browser or private mode).
  }
}
