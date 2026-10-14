// Tech.cg service worker: makes the site installable and usable on a weak connection.
// - Pages: network first; the homepage and articles you've opened are kept for offline reading.
// - Build assets (/_next/static) and fonts: cache first (their URLs change with each deploy).
// - Images: shown from cache, refreshed in the background.
// - Never cached: the API, the admin, sign-in, form posts.
const VERSION = "v3";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 40;
const MAX_IMAGES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![PAGES, ASSETS, IMAGES].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/** Drops the oldest entries so a cache stays under `max`. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

/** Pages worth keeping for offline reading: the homepage, articles, Profiles.CG and Sources. */
function keepsOffline(url) {
  const p = url.pathname;
  return p === "/" || p.startsWith("/publication/") || p === "/profils" || p.startsWith("/profils/") || p === "/sources";
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && keepsOffline(url) && !url.search) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(request, copy).then(() => trim(PAGES, MAX_PAGES)));
    }
    return response;
  } catch {
    // offline.html is plain HTML (no Next.js scripts), so it can stand in for any address.
    return (await caches.match(request, { ignoreVary: true })) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(ASSETS).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(IMAGES).then((cache) => cache.put(request, copy).then(() => trim(IMAGES, MAX_IMAGES)));
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && /^\/(api|godmod|connexion|inscription)(\/|$)/.test(url.pathname)) return;

  // Full page loads (not Next's in-app navigations, which send an RSC header).
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (sameOrigin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.destination === "font") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
