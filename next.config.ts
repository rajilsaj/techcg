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
  ["/recover", "/recuperation"],
  ["/submit", "/publier"],
  ["/item/:id", "/publication/:id"],
  ["/user/:username", "/profil/:username"],
  ["/auth/complete", "/connexion/confirmation"],
  ["/godmod/users", "/godmod/utilisateurs"],
  ["/godmod/content", "/godmod/moderation"],
  ["/godmod/settings", "/godmod/parametres"],
];

const config: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return ENGLISH_PATHS.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default config;
