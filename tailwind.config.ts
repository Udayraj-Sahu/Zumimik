import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Theme colours are CSS variables holding hex values, which Tailwind cannot apply an opacity modifier to: `bg-primary/10`,
 * `border-border/60`, `bg-destructive/10` and the like generated NO css, so tinted surfaces, rings and borders were missing (several
 * hundred uses). `tok` returns the variable as is, and a color-mix() of it when a modifier is present.
 *
 * TEXT colours are left as they were (`FIXED`): `text-muted-foreground/40` and its relatives (about 600 uses) are written as very dim
 * text. Measured across every screen and theme, honouring them takes axe colour-contrast failures from about 50 to about 380 (dark 2 to
 * 113, light 43 to 151, study 7 to 117), so they stay inert until those labels are reviewed one by one.
 */
const FIXED = new Set([
  "--foreground", "--muted-foreground", "--card-foreground", "--popover-foreground", "--primary-foreground", "--secondary-foreground",
  "--accent-foreground", "--destructive-foreground", "--sidebar-foreground", "--sidebar-primary-foreground", "--sidebar-accent-foreground",
  "--chrome-muted", "--chrome-hover", "--chrome-foreground",
]);
const tok = (name: string) =>
  (({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue === undefined || FIXED.has(name)) return `var(${name})`;
    const alpha = Number.parseFloat(opacityValue);
    if (!Number.isFinite(alpha) || alpha >= 1) return `var(${name})`;
    return `color-mix(in srgb, var(${name}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
  }) as unknown as string; // Tailwind accepts a function here; its published type only lists strings

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
        background: tok("--background"),
        foreground: tok("--foreground"),
        card: tok("--card"),
        "card-foreground": tok("--card-foreground"),
        popover: tok("--popover"),
        "popover-foreground": tok("--popover-foreground"),
        primary: tok("--primary"),
        "primary-foreground": tok("--primary-foreground"),
        secondary: tok("--secondary"),
        "secondary-foreground": tok("--secondary-foreground"),
        muted: tok("--muted"),
        "muted-foreground": tok("--muted-foreground"),
        accent: tok("--accent"),
        "accent-foreground": tok("--accent-foreground"),
        destructive: tok("--destructive"),
        "destructive-foreground": tok("--destructive-foreground"),
        border: tok("--border"),
        input: tok("--input"),
        ring: tok("--ring"),
        "chart-1": tok("--chart-1"),
        "chart-2": tok("--chart-2"),
        "chart-3": tok("--chart-3"),
        "chart-4": tok("--chart-4"),
        "chart-5": tok("--chart-5"),
        surface: tok("--surface"),
        sidebar: {
          DEFAULT: tok("--sidebar"),
          foreground: tok("--sidebar-foreground"),
          primary: tok("--sidebar-primary"),
          "primary-foreground": tok("--sidebar-primary-foreground"),
          accent: tok("--sidebar-accent"),
          "accent-foreground": tok("--sidebar-accent-foreground"),
          border: tok("--sidebar-border"),
          ring: tok("--sidebar-ring"),
        },
        chrome: {
          DEFAULT: tok("--chrome"),
          raised: tok("--chrome-raised"),
          border: tok("--chrome-border"),
          muted: tok("--chrome-muted"),
          hover: tok("--chrome-hover"),
          foreground: tok("--chrome-foreground"),
          active: tok("--chrome-active"),
          avatar: tok("--chrome-avatar"),
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
