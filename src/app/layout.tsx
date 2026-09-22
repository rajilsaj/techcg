import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { getLocale, getT } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: SITE.name, description: t("site.description") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getT();

  return (
    <html lang={locale} suppressHydrationWarning>
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
        <LocaleProvider locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only">
            {t("site.skipToContent")}
          </a>
          <main id="main">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
