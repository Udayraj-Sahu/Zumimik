/**
 * Regenerates the accent token blocks in src/app/globals.css from the
 * accentThemes config in src/lib/theme/theme-tokens.ts.
 *
 * `theme-tokens.ts` is the single source of truth. This script only renders it to
 * CSS; src/lib/theme/theme-tokens.test.ts asserts the emitted CSS matches the config,
 * so a stale or hand-edited block fails the suite rather than silently drifting.
 *
 * Run with:
 *   node --experimental-strip-types scripts/generate-accent-tokens.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ACCENT_CSS_VARS,
  ACCENT_IDS,
  accentThemes,
  type AccentId,
  type AccentTokenSet,
} from "../src/lib/theme/theme-tokens.ts";

const ROOT = join(import.meta.dirname, "..");
const CSS_PATH = join(ROOT, "src", "app", "globals.css");

/** Props we never render from the config because they are not part of AccentTokenSet. */
const SIDE_TOKENS: [string, (t: AccentTokenSet) => string][] = [
  ["--sidebar-primary", (t) => t.primary],
  ["--sidebar-primary-foreground", (t) => t.primaryForeground],
  ["--sidebar-accent-foreground", (t) => t.accentForeground],
  ["--sidebar-ring", (t) => t.ring],
];

/**
 * Renders the whole block body from the config. ACCENT_CSS_VARS already covers
 * the alpha ramp entries (it is derived from the same key set), so nothing is
 * appended separately here.
 */
function propsFor(tokens: AccentTokenSet): string {
  const lines: string[] = [];
  for (const [key, cssVar] of Object.entries(ACCENT_CSS_VARS)) {
    lines.push(`  ${cssVar}: ${tokens[key as keyof AccentTokenSet]};`);
  }
  for (const [cssVar, pick] of SIDE_TOKENS) {
    lines.push(`  ${cssVar}: ${pick(tokens)};`);
  }
  return lines.join("\n");
}

let css = readFileSync(CSS_PATH, "utf8");
let rendered = 0;

for (const id of ACCENT_IDS as AccentId[]) {
  const theme = accentThemes[id];
  for (const mode of ["dark", "light"] as const) {
    const selector = mode === "dark" ? `[data-accent="${id}"]` : `.light[data-accent="${id}"]`;
    const marker = `${selector} {`;
    const start = css.indexOf(marker);
    if (start === -1) {
      throw new Error(`Missing accent block for ${marker} in globals.css`);
    }
    const bodyStart = start + marker.length;
    const end = css.indexOf("}", bodyStart);
    if (end === -1) {
      throw new Error(`Unterminated accent block for ${marker} in globals.css`);
    }

    const next = `${marker}\n${propsFor(theme[mode])}\n`;
    css = css.slice(0, start) + next + css.slice(end);
    rendered++;
  }
}

writeFileSync(CSS_PATH, css, "utf8");
console.log(`Rendered ${rendered} accent blocks (${ACCENT_IDS.length} accents x 2 modes) into globals.css.`);
