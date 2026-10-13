import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
      },
      colors: {
        // color-mix lets opacity modifiers (bg-accent/10, bg-bg/90) work with a CSS variable.
        bg: withAlpha("--bg"),
        "bg-secondary": "var(--bg-secondary)",
        text: "var(--text)",
        "text-secondary": withAlpha("--text-secondary"),
        border: "var(--border)",
        accent: withAlpha("--accent"),
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
export default config;
