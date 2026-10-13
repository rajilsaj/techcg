import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Web app manifest: lets phones install Tech.cg as an app (home-screen icon, full screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.name,
    description: "L'actualité tech d'Afrique centrale : lisez, votez et discutez.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0066ff",
    categories: ["news", "technology"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Publier", url: "/publier", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Indicateurs", url: "/indicateurs", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
