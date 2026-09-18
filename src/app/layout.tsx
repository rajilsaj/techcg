import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          Skip to main content
        </a>
        <main id="main">
          {children}
        </main>
      </body>
    </html>
  );
}
