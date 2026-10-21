import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  ACCENT_CSS_VARS,
  ACCENT_IDS,
  ACCENT_ALPHA_STEPS,
  DEFAULT_ACCENT,
  accentThemes,
  isAccentId,
  type AccentId,
  type AccentTokenSet,
} from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Contrast helpers (WCAG 2.1 relative luminance)                     */
/* ------------------------------------------------------------------ */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ */
/*  Structural guarantees                                              */
/* ------------------------------------------------------------------ */

describe("accent alpha ramp", () => {
  const rgbOf = (rgba: string): [number, number, number, number] => {
    const m = rgba.match(
      /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
    );
    if (!m) throw new Error(`not an rgba() value: ${rgba}`);
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  };

  it("covers every documented step", () => {
    expect([...ACCENT_ALPHA_STEPS]).toEqual([
      "04", "06", "08", "10", "12", "15", "20", "25", "30", "40", "50",
    ]);
  });

  it.each(ACCENT_IDS)(
    "%s: every ramp step is a tint of that set's own primary",
    (id) => {
      const set = accentThemes[id as AccentId].dark;
      const [pr, pg, pb] = parseHex(set.primary);
      for (const step of ACCENT_ALPHA_STEPS) {
        const [r, g, b, alpha] = rgbOf(
          set[`alpha${step}` as keyof AccentTokenSet] as string,
        );
        expect([r, g, b]).toEqual([pr, pg, pb]);
        expect(alpha).toBeCloseTo(Number(step) / 100, 5);
      }
    },
  );

  it.each(ACCENT_IDS)(
    "%s: ramp opacity increases monotonically",
    (id) => {
      for (const mode of ["dark", "light"] as const) {
        const set = accentThemes[id as AccentId][mode];
        const alphas = ACCENT_ALPHA_STEPS.map(
          (step) => rgbOf(set[`alpha${step}` as keyof AccentTokenSet] as string)[3],
        );
        for (let i = 1; i < alphas.length; i++) {
          expect(alphas[i]).toBeGreaterThan(alphas[i - 1]);
        }
      }
    },
  );

  it("light-mode ramp is tinted with the darkened light primary, not the dark one", () => {
    for (const id of ACCENT_IDS) {
      const theme = accentThemes[id as AccentId];
      const darkRgb = rgbOf(theme.dark.alpha20 as string).slice(0, 3);
      const lightRgb = rgbOf(theme.light.alpha20 as string).slice(0, 3);
      expect(lightRgb).toEqual(parseHex(theme.light.primary));
      // Guards against reusing the dark ramp for the light set.
      expect(lightRgb).not.toEqual(darkRgb);
    }
  });

  it("every ramp step is defined in the CSS for all 16 blocks", () => {
    const css = readGlobals();
    for (const id of ACCENT_IDS) {
      for (const mode of ["dark", "light"] as const) {
        // Anchor on the leading newline so the dark lookup cannot match inside
        // the later `.light[...]` block, which contains the same substring.
        const rule = readRule(
          css,
          mode === "dark" ? `\n[data-accent="${id}"]` : `\n.light[data-accent="${id}"]`,
        );
        expect(rule).not.toBeNull();
        for (const step of ACCENT_ALPHA_STEPS) {
          const e = rgbOf(
            accentThemes[id as AccentId][mode][
              `alpha${step}` as keyof AccentTokenSet
            ] as string,
          );
          expect(rule![`--accent-${step}`]).toBe(
            `rgba(${e[0]}, ${e[1]}, ${e[2]}, ${e[3]})`,
          );
        }
      }
    }
  });
});

describe("accentThemes", () => {
  it("exposes exactly the eight supported accents", () => {
    expect(ACCENT_IDS).toEqual([
      "lime",
      "emerald",
      "cyan",
      "violet",
      "amber",
      "red",
      "orange",
      "blue",
    ]);
  });

  it("defaults to lime so the shipped theme is unchanged", () => {
    expect(DEFAULT_ACCENT).toBe("lime");
    expect(isAccentId(DEFAULT_ACCENT)).toBe(true);
  });

  it.each(ACCENT_IDS)("defines a complete dark and light token set for %s", (id) => {
    const theme = accentThemes[id];
    expect(theme, `missing theme for ${id}`).toBeTruthy();
    expect(theme.label.length).toBeGreaterThan(0);
    expect(theme.swatch).toMatch(/^#[0-9a-fA-F]{6}$/);

    for (const mode of ["dark", "light"] as const) {
      const set = theme[mode] as AccentTokenSet;
      for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
        const value = set[key as keyof AccentTokenSet];
        expect(value, `${id}.${mode}.${key} missing`).toBeTruthy();
        expect(value, `${id}.${mode}.${key} -> ${cssVar} must be a color`)
          .toMatch(/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))$/);
      }
    }
  });

  it("validates accent ids strictly", () => {
    expect(isAccentId("lime")).toBe(true);
    expect(isAccentId("violet")).toBe(true);
    expect(isAccentId("chartreuse")).toBe(false);
    expect(isAccentId(undefined)).toBe(false);
    expect(isAccentId(null)).toBe(false);
    expect(isAccentId(42)).toBe(false);
    expect(isAccentId("")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Accessibility gates                                                */
/* ------------------------------------------------------------------ */

describe("accent contrast (WCAG AA)", () => {
  const DARK_SURFACE = "#0A0C0A";
  const LIGHT_SURFACE = "#FFFFFF";

  it.each(ACCENT_IDS)("%s dark: text and controls are legible on the dark surface", (id) => {
    const t = accentThemes[id].dark;
    const where = `accent "${id}" dark`;
    // Text drawn in the accent color on the app background.
    expect(contrastRatio(t.accentForeground, DARK_SURFACE), `${where} accentForeground on bg`).toBeGreaterThanOrEqual(4.5);
    // Text drawn on the solid primary surface.
    expect(contrastRatio(t.primaryForeground, t.primary), `${where} primaryForeground on primary`).toBeGreaterThanOrEqual(4.5);
    // Text drawn on both CTA gradient stops.
    expect(contrastRatio(t.onAccent, t.ctaFrom), `${where} onAccent on ctaFrom`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.onAccent, t.ctaTo), `${where} onAccent on ctaTo`).toBeGreaterThanOrEqual(4.5);
    // Focus ring is a non-text UI element: 3:1 is the AA threshold.
    expect(contrastRatio(t.ring, DARK_SURFACE), `${where} ring on bg`).toBeGreaterThanOrEqual(3);
    // Chart series must be visible against the plot surface.
    expect(contrastRatio(t.chart1, DARK_SURFACE), `${where} chart1 on bg`).toBeGreaterThanOrEqual(3);
  });

  it.each(ACCENT_IDS)("%s light: text and controls are legible on white panels", (id) => {
    const t = accentThemes[id].light;
    const where = `accent "${id}" light`;
    expect(contrastRatio(t.accentForeground, LIGHT_SURFACE), `${where} accentForeground on card`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.primaryForeground, t.primary), `${where} primaryForeground on primary`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.onAccent, t.ctaFrom), `${where} onAccent on ctaFrom`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.onAccent, t.ctaTo), `${where} onAccent on ctaTo`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.ring, LIGHT_SURFACE), `${where} ring on card`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(t.chart1, LIGHT_SURFACE), `${where} chart1 on card`).toBeGreaterThanOrEqual(3);
  });

  it("keeps every light-mode accent inside the lime-style darkened band, not a bright fill", () => {
    // Light mode draws accent text on near-white panels. A bright fill hue would
    // blow past the 4.5:1 gate, so each light primary must be materially darker
    // than its dark counterpart.
    for (const id of ACCENT_IDS) {
      expect(
        relativeLuminance(accentThemes[id].light.primary),
        `accent "${id}": light primary must be darker than dark primary`,
      ).toBeLessThan(relativeLuminance(accentThemes[id].dark.primary));
    }
  });

  it("uses a light foreground on light-mode primary fills and a dark one on dark-mode fills", () => {
    for (const id of ACCENT_IDS) {
      const theme = accentThemes[id];
      expect(relativeLuminance(theme.dark.primaryForeground), `${id} dark primaryForeground must be dark`).toBeLessThan(0.2);
      expect(relativeLuminance(theme.light.primaryForeground), `${id} light primaryForeground must be light`).toBeGreaterThan(0.5);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Backwards compatibility: default theme must not change             */
/* ------------------------------------------------------------------ */

describe("dark + lime parity with the pre-accent theme", () => {
  it("reproduces the historical :root lime values byte for byte", () => {
    const d = accentThemes.lime.dark;
    expect(d.primary).toBe("#C8FF5A");
    expect(d.ring).toBe("#C8FF5A");
    expect(d.accentForeground).toBe("#C8FF5A");
    expect(d.chart1).toBe("#C8FF5A");
    expect(d.ctaFrom).toBe("#C7F252");
    expect(d.ctaTo).toBe("#A8D43A");
    expect(d.onAccent).toBe("#0A0C0A");
    expect(d.primaryForeground).toBe("#050505");
  });

  it("keeps light mode in the lime family instead of snapping to green", () => {
    const l = accentThemes.lime.light;
    // The old light theme forced #1A8C3A (a green that collided with success).
    expect(l.primary).not.toBe("#1A8C3A");
    expect(l.accentForeground).toBe("#4D7C0F");
  });
});

/* ------------------------------------------------------------------ */
/*  globals.css mirror parity                                          */
/* ------------------------------------------------------------------ */

const GLOBALS_CSS = path.join(process.cwd(), "src", "app", "globals.css");

function readGlobals(): string {
  return fs.readFileSync(GLOBALS_CSS, "utf8");
}

/** Extract the declarations inside a single CSS rule, keyed by custom property. */
function readRule(css: string, selector: string): Record<string, string> | null {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const open = css.indexOf("{", start);
  if (open === -1) return null;
  const close = css.indexOf("}", open);
  if (close === -1) return null;
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Every custom property declared anywhere in the file, last definition wins. */
function allCustomProperties(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

describe("globals.css mirrors accentThemes", () => {
  const css = readGlobals();

  it.each(ACCENT_IDS)("declares a [data-accent=\"%s\"] rule with every token", (id) => {
    const rule = readRule(css, `[data-accent="${id}"]`);
    expect(rule, `globals.css is missing [data-accent="${id}"]`).toBeTruthy();
    for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
      expect(rule![cssVar], `[data-accent="${id}"] must set ${cssVar} (from ${key})`).toBeTruthy();
    }
  });

  it.each(ACCENT_IDS)("declares a .light[data-accent=\"%s\"] rule with every token", (id) => {
    const rule = readRule(css, `.light[data-accent="${id}"]`);
    expect(rule, `globals.css is missing .light[data-accent="${id}"]`).toBeTruthy();
    for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
      expect(rule![cssVar], `.light[data-accent="${id}"] must set ${cssVar} (from ${key})`).toBeTruthy();
    }
  });

  it.each(ACCENT_IDS)("[data-accent=\"%s\"] values match the TS config exactly", (id) => {
    const rule = readRule(css, `[data-accent="${id}"]`)!;
    const set = accentThemes[id].dark;
    for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
      expect(rule[cssVar], `${id} dark ${cssVar} drifted from theme-tokens.ts`).toBe(
        set[key as keyof AccentTokenSet],
      );
    }
  });

  it.each(ACCENT_IDS)(".light[data-accent=\"%s\"] values match the TS config exactly", (id) => {
    const rule = readRule(css, `.light[data-accent="${id}"]`)!;
    const set = accentThemes[id].light;
    for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
      expect(rule[cssVar], `${id} light ${cssVar} drifted from theme-tokens.ts`).toBe(
        set[key as keyof AccentTokenSet],
      );
    }
  });

  it("gives every scoped root a lime fallback via :root", () => {
    const root = readRule(css, ":root {");
    expect(root).toBeTruthy();
    const lime = accentThemes.lime.dark;
    // Landing/onboarding never receive data-accent, so :root must already be lime.
    expect(root!["--primary"]).toBe(lime.primary);
    expect(root!["--ring"]).toBe(lime.ring);
  });

  it("no longer forces the light theme's primary to the old green", () => {
    // The green #1A8C3A coupled light mode to a success-like hue and would fight
    // every non-green accent. It must be gone from the .light surface block.
    const light = readRule(css, "\n.light {")!;
    const greenish = ["#1A8C3A", "#E8F5E9"];
    for (const value of greenish) {
      expect(Object.values(light), `.light still hardcodes ${value}`).not.toContain(value);
    }
  });

  it("defines --cta-45, which the pill/tile shadows reference", () => {
    const declared = allCustomProperties(css);
    expect(declared["--cta-45"], "--cta-45 is referenced by shadow rules but was never defined").toBeTruthy();
  });

  it("declares every custom property that a var() reference resolves", () => {
    // A var() with no declaration silently drops the whole declaration, which is
    // how --cta-45 shipped broken for so long. Guard the whole file.
    const declared = allCustomProperties(css);
    const referenced = new Set<string>();
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) referenced.add(m[1]);

    // --font-* are injected at runtime by next/font via the <body> className in
    // app/layout.tsx, so they legitimately have no declaration in this file.
    const externallyInjected = /^--font-/;
    const missing = [...referenced]
      .filter((v) => !(v in declared) && !externallyInjected.test(v))
      .sort();
    expect(missing, `var() references with no declaration anywhere in globals.css: ${missing.join(", ")}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  Registry integrity                                                 */
/* ------------------------------------------------------------------ */

describe("ACCENT_CSS_VARS", () => {
  it("maps every token to a distinct kebab-case custom property", () => {
    const vars = Object.values(ACCENT_CSS_VARS);
    expect(new Set(vars).size).toBe(vars.length);
    for (const v of vars) expect(v).toMatch(/^--[a-z0-9-]+$/);
  });

  it("covers exactly the keys present on an AccentTokenSet", () => {
    const sample = accentThemes.lime.dark;
    expect(Object.keys(ACCENT_CSS_VARS).sort()).toEqual(Object.keys(sample).sort());
  });
});

describe("accent id coverage", () => {
  it("has a config entry for every declared id", () => {
    for (const id of ACCENT_IDS satisfies AccentId[]) {
      expect(Object.keys(accentThemes)).toContain(id);
    }
    expect(Object.keys(accentThemes).sort()).toEqual([...ACCENT_IDS].sort());
  });

  it("gives every accent a unique swatch so the selector stays distinguishable", () => {
    const swatches = ACCENT_IDS.map((id) => accentThemes[id].swatch.toLowerCase());
    expect(new Set(swatches).size).toBe(swatches.length);
  });
});
