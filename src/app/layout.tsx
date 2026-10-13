import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { t } from "@/i18n";
import { SITE } from "@/lib/site";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import "@/styles/globals.css";

const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription } = await getSettings();
  return {
    title: { default: siteName, template: `%s · ${siteName}` },
    description: siteDescription,
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  // Draw under the notch / home bar; the header and tab bar pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={quicksand.variable} suppressHydrationWarning>
      <head>
        {/* App install tags. Written here, not in generateMetadata: async metadata is streamed
            into <body>, where browsers ignore the manifest and the iOS home-screen tags. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={SITE.name} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // The device setting, unless the visitor picked a theme with the sun button.
                var choice = null;
                try { choice = localStorage.getItem('theme-choice'); localStorage.removeItem('theme'); } catch (e) {}
                var isDark = choice === 'dark' ||
                  (choice !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
              })();
            `,
          }}
        />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          {t("site.skipToContent")}
        </a>
        <main id="main">{children}</main>
        <SiteFooter />
        <VisitTracker />
        <ServiceWorker />
      </body>
    </html>
  );
}
