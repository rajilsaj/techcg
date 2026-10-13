import type { Config } from "tailwindcss";

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
        bg: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        border: "var(--border)",
        // color-mix lets opacity modifiers (bg-accent/10) work with a CSS variable.
        accent: "color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
export default config;
