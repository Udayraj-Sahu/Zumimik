import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // The app themes via a `.dark`/`.light` class toggled by the theme store, NOT via
  // the OS preference. Without this, `dark:` utilities silently track
  // `prefers-color-scheme` and desync from the in-app toggle.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        white: "rgb(var(--color-white-rgb) / <alpha-value>)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        surface: "var(--surface)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        chrome: {
          DEFAULT: "var(--chrome)",
          raised: "var(--chrome-raised)",
          border: "var(--chrome-border)",
          muted: "var(--chrome-muted)",
          hover: "var(--chrome-hover)",
          foreground: "var(--chrome-foreground)",
          active: "var(--chrome-active)",
          avatar: "var(--chrome-avatar)",
        },
      },
      fontSize: {
        micro: ["11px", { lineHeight: "1.3" }],
        "fluid-xs": ["clamp(11px, 1vw, 12px)", { lineHeight: "1.3" }],
        "fluid-sm": ["clamp(12px, 1.4vw, 13px)", { lineHeight: "1.4" }],
        "fluid-base": ["clamp(13px, 2vw, 15px)", { lineHeight: "1.5" }],
        "fluid-lg": ["clamp(15px, 2.5vw, 20px)", { lineHeight: "1.3" }],
        "fluid-xl": ["clamp(18px, 3.5vw, 28px)", { lineHeight: "1.2" }],
        "fluid-2xl": ["clamp(22px, 4.5vw, 34px)", { lineHeight: "1.1" }],
        "fluid-3xl": ["clamp(28px, 5vw, 40px)", { lineHeight: "1.1" }],
      },
      keyframes: {
        "breath-glow": {
          "0%, 100%": { boxShadow: "0 0 8px var(--primary)", opacity: "1" },
          "50%": { boxShadow: "0 0 18px var(--primary)", opacity: "0.85" },
        },
      },
      animation: {
        "breath-glow": "breath-glow 2.5s ease-in-out infinite",
      },
      backgroundImage: {
        cta: "linear-gradient(90deg, var(--cta-from), var(--cta-to))",
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
    },
  },
  // `light:` utilities match elements inside a `.light` scope (the theme store
  // toggles `.light` on every `[data-theme-scope]`). Lets components own their
  // light-mode overrides instead of globals.css scraping class strings.
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ".light &");
    }),
  ],
};

export default config;
