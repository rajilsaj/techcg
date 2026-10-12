import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { t } from "@/i18n";
import "@/styles/globals.css";

const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription } = await getSettings();
  return { title: { default: siteName, template: `%s · ${siteName}` }, description: siteDescription };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={quicksand.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                const isDark = theme === 'dark' ||
                  (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
                else document.documentElement.setAttribute('data-theme', 'light');
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
      </body>
    </html>
  );
}
