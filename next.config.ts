import type { NextConfig } from "next";

/** Old English URLs → French ones, so existing links and bookmarks keep working. */
const ENGLISH_PATHS: [string, string][] = [
  ["/newest", "/recents"],
  ["/ask", "/questions"],
  ["/show", "/vitrine"],
  ["/jobs", "/emplois"],
  ["/comments", "/commentaires"],
  ["/login", "/connexion"],
  ["/register", "/inscription"],
  ["/recover", "/connexion"],
  ["/submit", "/publier"],
  ["/item/:id", "/publication/:id"],
  ["/user/:username", "/profil/:username"],
  ["/auth/complete", "/connexion"],
  // Phone and email-link sign-in were removed: Google only.
  ["/recuperation", "/connexion"],
  ["/connexion/confirmation", "/connexion"],
  ["/godmod/users", "/godmod/utilisateurs"],
  ["/godmod/content", "/godmod/commentaires"],
  ["/godmod/settings", "/godmod/parametres"],
];

/**
 * Routes that run « Navigateur » imports need the headless browser's files. Not the
 * homepage: its visit-triggered imports skip those sources, so it stays light.
 */
const BROWSER_FILES = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/cron/import": BROWSER_FILES,
    "/godmod/importation": BROWSER_FILES,
  },
  async headers() {
    // The service worker must never be served stale, or fixes to it would take days to reach phones.
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return ENGLISH_PATHS.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default config;
