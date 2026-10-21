"use client";

import { useThemeStore } from "@/stores/theme-store";
import { accentThemes } from "@/lib/theme";

/**
 * Resolved hex for the active accent in the active mode.
 *
 * Needed wherever a color must be manipulated in JS -- hex alpha concatenation
 * (`${accent}1a`) and channel math (shade()) -- because those cannot be done
 * with `var(--primary)`. Prefer the CSS custom properties wherever possible;
 * reach for this only when the value has to reach JavaScript.
 */
export function useAccentHex(): string {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  return accentThemes[accent][theme].primary;
}

/**
 * The accent's bright swatch -- the same saturated hue shown in the settings
 * picker, independent of light/dark mode.
 *
 * Use for brand *graphics* that must stay vivid on both surfaces (e.g. the
 * dashboard mascot's body). Do NOT use for text or UI: those need the
 * mode-resolved tokens via the CSS custom properties or {@link useAccentHex}.
 */
export function useAccentSwatch(): string {
  const accent = useThemeStore((s) => s.accent);
  return accentThemes[accent].swatch;
}
