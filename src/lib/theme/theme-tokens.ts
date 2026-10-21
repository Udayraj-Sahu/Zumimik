// Single source of truth for the design palette.
// globals.css mirrors these values as CSS custom properties. `accent-themes.test.ts`
// asserts the two stay in sync — if you edit an accent here, update the matching
// [data-accent="<id>"] block in globals.css or the test fails.
// Colors are strictly value-preserving (dark-mode values are never changed).
// Flip-set tokens (light theme) resolve to var(--<css-name>) so they respond to .light.

export const LIME = "#C8FF4D";
export const LIME_BRIGHT = "#C8FF5A";
export const CTA_LIME = "#C7F252";
export const CTA_TO = "#A8D43A";
export const LIME_LIGHT = "#B9F45C";
export const LIME_MID = "#a8e62e";
export const LIME_MID_2 = "#9be66a";
export const LIME_DARK = "#9fd42f";
export const LIME_DEEPER = "#8fca2a";
export const LIME_PALE = "#d4ff6e";
export const LIME_PALE_2 = "#d7ff7e";
export const LIME_TINT = "#e8ffb0";
export const LIME_PALE_3 = "#E9FFA8";
export const GREEN_SOFT = "#7DDB6A";
export const EMERALD = "#34D399";
export const EMERALD_SOLID = "#10B981";
// Darker emerald for text on light surfaces: #34D399/#10B981 only reach
// ~2.1–2.5:1 on white, below the 4.5:1 WCAG AA floor for small text.
export const EMERALD_DEEP = "#047857";
export const EMERALD_LIGHT = "#4ADE80";
export const EMERALD_PALE = "#86efac";
export const GREEN_SOLID = "#22C55E";
export const CYAN = "#22D3EE";
export const CYAN_LIGHT = "#3DD6F5";
export const SKY = "#06b6d4";
export const BLUE = "#3B82F6";
export const BLUE_LIGHT = "#60A5FA";
export const VIOLET_PURPLE = "#A78BFA";
export const VIOLET_PURPLE_2 = "#B98CF0";
export const VIOLET_DEEP = "#8B5CF6";
export const VIOLET_DARK = "#7C6CF0";
export const PURPLE = "#A855F7";
export const FUCHSIA = "#E879F9";
export const AMBER = "#F59E0B";
export const AMBER_DARK = "#D97706";
export const AMBER_LIGHT = "#F0A93D";
export const YELLOW = "#FBBF24";
export const GOLD = "#FFD700";
export const ORANGE = "#FF6B35";
export const ROSE = "#FB7185";
export const ROSE_PINK = "#F05C7A";
export const RED_SOFT = "#ff5c5c";
export const RED = "#EF4444";
export const BRONZE = "#CD7F32";
export const SILVER = "#C0C0C0";
export const WHITE = "#ffffff";
export const NEAR_BLACK = "#050505";
export const MUTED = "#8B8B8B";
export const MUTED_GREEN = "#8B9086";
export const SLATE = "#9CA3AF";
export const SLATE_DARK = "#6B7280";
export const SLATE_DARKEST = "#4B5563";
export const SLATE_SOFT = "#94A3B8";

/* ------------------------------------------------------------------ */
/*  Hue-as-text resolver                                                */
/* ------------------------------------------------------------------ */
// The raw palette constants above are dark-mode tuned. Passing one straight to
// `style={{ color: AMBER }}` pins a bright hue that fails contrast once it lands
// on a light surface. `hueText` swaps such a value for the matching CSS custom
// property, which the light theme re-darkens, so text stays legible in both
// themes. Tints and gradients are untouched because `${color}1A` still needs a
// literal hex to interpolate.
const HUE_TEXT_VARS: Record<string, string> = {
  [LIME]: "var(--lime)",
  [LIME_BRIGHT]: "var(--lime-bright)",
  [CTA_LIME]: "var(--lime)",
  [GREEN_SOFT]: "var(--green-soft)",
  [EMERALD]: "var(--emerald)",
  [EMERALD_SOLID]: "var(--emerald-solid)",
  [EMERALD_LIGHT]: "var(--emerald-light)",
  [CYAN]: "var(--cyan)",
  [CYAN_LIGHT]: "var(--cyan-light)",
  [SKY]: "var(--sky)",
  [BLUE]: "var(--blue)",
  [BLUE_LIGHT]: "var(--blue-light)",
  [VIOLET_PURPLE]: "var(--violet)",
  [VIOLET_PURPLE_2]: "var(--violet-purple-2)",
  [VIOLET_DEEP]: "var(--violet-deep)",
  [VIOLET_DARK]: "var(--violet-dark)",
  [PURPLE]: "var(--purple)",
  [FUCHSIA]: "var(--fuchsia)",
  [AMBER]: "var(--amber)",
  [AMBER_DARK]: "var(--amber-dark)",
  [AMBER_LIGHT]: "var(--amber-light)",
  [YELLOW]: "var(--yellow)",
  [GOLD]: "var(--gold)",
  [ORANGE]: "var(--orange)",
  [ROSE]: "var(--rose)",
  [ROSE_PINK]: "var(--rose-pink)",
  [RED_SOFT]: "var(--red-soft)",
  [RED]: "var(--red)",
  [BRONZE]: "var(--bronze)",
  [SILVER]: "var(--silver)",
  [MUTED_GREEN]: "var(--muted-green)",
  [SLATE]: "var(--slate)",
  [SLATE_DARK]: "var(--slate-dark)",
  [SLATE_DARKEST]: "var(--slate-darkest)",
  [SLATE_SOFT]: "var(--slate-soft)",
  [MUTED]: "var(--muted-foreground)",
};

const HUE_TEXT_VARS_UPPER = Object.fromEntries(
  Object.entries(HUE_TEXT_VARS).map(([key, value]) => [key.toUpperCase(), value]),
);

/** Map a raw palette hex to its theme-aware CSS var; unknown values pass through. */
export function hueText(value: string): string {
  return HUE_TEXT_VARS_UPPER[value.toUpperCase()] ?? value;
}

export const BG = "var(--bg)";
export const BG_SOFT = "var(--bg-soft)";
export const BG_2 = "var(--bg-2)";
export const BG_BLUE = "var(--bg-blue)";
export const BG_DEEP = "var(--bg-deep)";
export const BG_MOSS = "var(--bg-moss)";
export const PANEL = "var(--panel)";
export const PANEL_2 = "var(--panel-2)";
export const FOREST = "var(--forest)";
export const FOREST_2 = "var(--forest-2)";
export const DEEP_BLACK = "#0d0d0d";
export const DEEP_BLACK_2 = "var(--deep-black-2)";
export const NEAR_WHITE_BLACK = "var(--near-white-black)";
export const SOLID_BLACK = "var(--solid-black)";
export const WARM_BLACK = "var(--warm-black)";
export const BLACKGREEN = "var(--blackgreen)";
export const BG_BLACK = "var(--bg-black)";
export const PANEL_SOLID = "var(--panel-solid)";
export const PANEL_WARM = "var(--panel-warm)";
export const GLASS_BG = "var(--glass-bg)";
export const GLASS_BORDER = "var(--glass-border)";
export const GLASS_01 = "var(--glass-01)";
export const GLASS_012 = "var(--glass-012)";
export const GLASS_015 = "var(--glass-015)";
export const GLASS_02 = "var(--glass-02)";
export const GLASS_025 = "var(--glass-025)";
export const GLASS_03 = "var(--glass-03)";
export const GLASS_045 = "var(--glass-045)";
export const GLASS_05 = "var(--glass-05)";
export const GLASS_06 = "var(--glass-06)";
export const GLASS_07 = "var(--glass-07)";
export const GLASS_09 = "var(--glass-09)";
export const GLASS_10 = "var(--glass-10)";
export const GLASS_12 = "var(--glass-12)";
export const GLASS_14 = "var(--glass-14)";
export const GLASS_15 = "var(--glass-15)";
export const GLASS_18 = "var(--glass-18)";
export const GLASS_22 = "var(--glass-22)";
export const GLASS_25 = "var(--glass-25)";
export const GLASS_30 = "var(--glass-30)";
export const GLASS_35 = "var(--glass-35)";
export const GLASS_40 = "var(--glass-40)";
export const GLASS_45 = "var(--glass-45)";
export const GLASS_50 = "var(--glass-50)";
export const GLASS_55 = "var(--glass-55)";
export const GLASS_70 = "var(--glass-70)";
export const GLASS_75 = "var(--glass-75)";
export const GLASS_92 = "var(--glass-92)";
export const BLACK_00 = "rgba(0,0,0,0)";
export const BLACK_06 = "rgba(0,0,0,0.06)";
export const BLACK_30 = "rgba(0,0,0,0.3)";
export const BLACK_35 = "rgba(0,0,0,0.35)";
export const BLACK_40 = "rgba(0,0,0,0.4)";
export const BLACK_50 = "rgba(0,0,0,0.5)";
export const BLACK_55 = "rgba(0,0,0,0.55)";
export const BLACK_60 = "rgba(0,0,0,0.6)";
export const BLACK_70 = "rgba(0,0,0,0.7)";
export const BLACK_80 = "rgba(0,0,0,0.8)";
export const CTA_03 = "rgba(199,242,82,0.03)";
export const CTA_04 = "rgba(199,242,82,0.04)";
export const CTA_05 = "rgba(199,242,82,0.05)";
export const CTA_06 = "rgba(199,242,82,0.06)";
export const CTA_08 = "rgba(199,242,82,0.08)";
export const CTA_12 = "rgba(199,242,82,0.12)";
export const CTA_14 = "rgba(199,242,82,0.14)";
export const CTA_15 = "rgba(199,242,82,0.15)";
export const CTA_18 = "rgba(199,242,82,0.18)";
export const CTA_20 = "rgba(199,242,82,0.2)";
export const CTA_25 = "rgba(199,242,82,0.25)";
export const CTA_30 = "rgba(199,242,82,0.3)";
export const CTA_35 = "rgba(199,242,82,0.35)";
export const CTA_40 = "rgba(199,242,82,0.4)";
export const CTA_80 = "rgba(199,242,82,0.8)";
export const LIME_10 = "rgba(200,255,77,0.1)";
export const LIME_12 = "rgba(200,255,77,0.12)";
export const LIME_14 = "rgba(200,255,77,0.14)";
export const LIME_15 = "rgba(200,255,77,0.15)";
export const LIME_18 = "rgba(200,255,77,0.18)";
export const LIME_22 = "rgba(200,255,77,0.22)";
export const LIME_25 = "rgba(200,255,77,0.25)";
export const LIME_30 = "rgba(200,255,77,0.3)";
export const LIME_32 = "rgba(200,255,77,0.32)";
export const LIME_40 = "rgba(200,255,77,0.4)";
export const LIME_45 = "rgba(200,255,77,0.45)";
export const LIME_50 = "rgba(200,255,77,0.5)";
export const LIME_BRIGHT_00 = "rgba(200,255,90,0.0)";
export const LIME_BRIGHT_03 = "rgba(200,255,90,0.03)";
export const LIME_BRIGHT_04 = "rgba(200,255,90,0.04)";
export const LIME_BRIGHT_05 = "rgba(200,255,90,0.05)";
export const LIME_BRIGHT_06 = "rgba(200,255,90,0.06)";
export const LIME_BRIGHT_10 = "rgba(200,255,90,0.1)";
export const LIME_BRIGHT_15 = "rgba(200,255,90,0.15)";
export const LIME_BRIGHT_18 = "rgba(200,255,90,0.18)";
export const LIME_BRIGHT_20 = "rgba(200,255,90,0.2)";
export const LIME_BRIGHT_25 = "rgba(200,255,90,0.25)";
export const LIME_BRIGHT_30 = "rgba(200,255,90,0.3)";
export const LIME_BRIGHT_40 = "rgba(200,255,90,0.4)";
export const LIME_BRIGHT_50 = "rgba(200,255,90,0.5)";
export const LIME_MID_25 = "rgba(163,230,53,0.25)";
export const LIME_MID_28 = "rgba(163,230,53,0.28)";
export const LIME_MID_35 = "rgba(163,230,53,0.35)";
export const EMERALD_04 = "rgba(52,211,153,0.04)";
export const EMERALD_06 = "rgba(52,211,153,0.06)";
export const EMERALD_08 = "rgba(52,211,153,0.08)";
export const EMERALD_10 = "rgba(52,211,153,0.1)";
export const EMERALD_12 = "rgba(52,211,153,0.12)";
export const EMERALD_15 = "rgba(52,211,153,0.15)";
export const EMERALD_20 = "rgba(52,211,153,0.2)";
export const EMERALD_25 = "rgba(52,211,153,0.25)";
export const EMERALD_30 = "rgba(52,211,153,0.3)";
export const EMERALD_40 = "rgba(52,211,153,0.4)";
export const EMERALD_50 = "rgba(52,211,153,0.5)";
export const EMERALD_LIGHT_40 = "rgba(110,231,183,0.4)";
export const CYAN_05 = "rgba(34,211,238,0.05)";
export const CYAN_06 = "rgba(34,211,238,0.06)";
export const CYAN_08 = "rgba(34,211,238,0.08)";
export const CYAN_10 = "rgba(34,211,238,0.10)";
export const CYAN_14 = "rgba(34,211,238,0.14)";
export const CYAN_18 = "rgba(34,211,238,0.18)";
export const CYAN_22 = "rgba(34,211,238,0.22)";
export const CYAN_25 = "rgba(34,211,238,0.25)";
export const CYAN_30 = "rgba(34,211,238,0.3)";
export const CYAN_45 = "rgba(34,211,238,0.45)";
export const CYAN_85 = "rgba(34,211,238,0.85)";
export const VIOLET_PURPLE_30 = "rgba(167,139,250,0.30)";
export const VIOLET_PURPLE_35 = "rgba(167,139,250,0.35)";
export const VIOLET_PURPLE_45 = "rgba(167,139,250,0.45)";
export const VIOLET_DEEP_14 = "rgba(139,92,246,0.14)";
export const VIOLET_DEEP_18 = "rgba(139,92,246,0.18)";
export const VIOLET_DEEP_28 = "rgba(139,92,246,0.28)";
export const VIOLET_TEXT = "rgba(167,139,250,0.92)";
export const AMBER_04 = "rgba(245,158,11,0.04)";
export const AMBER_06 = "rgba(245,158,11,0.06)";
export const AMBER_08 = "rgba(245,158,11,0.08)";
export const AMBER_14 = "rgba(245,158,11,0.14)";
export const AMBER_15 = "rgba(245,158,11,0.15)";
export const AMBER_20 = "rgba(245,158,11,0.2)";
export const AMBER_30 = "rgba(245,158,11,0.3)";
export const RED_04 = "rgba(239,68,68,0.04)";
export const RED_06 = "rgba(239,68,68,0.06)";
export const RED_10 = "rgba(239,68,68,0.1)";
export const RED_12 = "rgba(239,68,68,0.12)";
export const RED_30 = "rgba(239,68,68,0.3)";
export const RED_SOFT_06 = "rgba(255,92,92,0.06)";
export const RED_SOFT_12 = "rgba(255,92,92,0.12)";
export const RED_SOFT_25 = "rgba(255,92,92,0.25)";
export const ROSE_PINK_12 = "rgba(240,92,122,0.12)";
export const VIOLET_DARK_12 = "rgba(124,108,240,0.12)";
export const CYAN_LIGHT_12 = "rgba(61,214,245,0.12)";
export const VIOLET_PURPLE_2_12 = "rgba(185,140,240,0.12)";
export const AMBER_LIGHT_12 = "rgba(240,169,61,0.12)";
export const GREEN_SOFT_12 = "rgba(125,219,106,0.12)";
export const SLATE_40 = "rgba(107,114,128,0.4)";
export const SLATE_50 = "rgba(107,114,128,0.5)";
export const SLATE_60 = "rgba(107,114,128,0.6)";
export const SLATE_SOFT_15 = "rgba(148,163,184,0.15)";
export const BLUE_06 = "rgba(59,130,246,0.06)";
export const SCREEN_TINT_85 = "var(--screen-tint-85)";
export const SCREEN_TINT = "var(--screen-tint)";
export const OVERLAY = "var(--overlay)";
export const OVERLAY_SOLID = "var(--overlay-solid)";
export const BLACKGREEN_90 = "var(--blackgreen-90)";
export const BRONZE_15 = "rgba(205,127,50,0.15)";
export const NEAR_BLACK_60 = "rgba(3,4,6,0.6)";
export const ORANGE_15 = "rgba(255,107,53,0.15)";
export const BLUE_10 = "rgba(59,130,246,0.1)";
export const BLUE_70 = "rgba(59,130,246,0.7)";
export const AMBER_10 = "rgba(245,158,11,0.1)";
export const CTA_LIME_10 = "rgba(199,242,82,0.1)";
export const LIME_06 = "rgba(200,255,77,0.06)";
export const BG_10 = "var(--bg-10)";
export const BG_60 = "var(--bg-60)";
export const LIME_07 = "rgba(200,255,77,0.07)";
export const LIME_20 = "rgba(200,255,77,0.2)";
export const LIME_04 = "rgba(200,255,77,0.04)";
export const LIME_08 = "rgba(200,255,77,0.08)";
export const LIME_70 = "rgba(200,255,77,0.7)";
export const LIME_85 = "rgba(200,255,77,0.85)";
export const RED_SOFT_30 = "rgba(255,92,92,0.3)";
export const RED_SOFT_10 = "rgba(255,92,92,0.1)";
export const VIOLET_PURPLE_70 = "rgba(167,139,250,0.7)";
export const LIME_60 = "rgba(200,255,77,0.6)";
export const LIME_16 = "rgba(200,255,77,0.16)";
export const LIME_PALE_3_70 = "rgba(233,255,168,0.7)";
export const LIME_55 = "rgba(200,255,77,0.55)";
export const ROSE_15 = "rgba(251,113,133,0.15)";
export const LIME_80 = "rgba(200,255,77,0.8)";
export const LIME_35 = "rgba(200,255,77,0.35)";
export const LIME_05 = "rgba(200,255,77,0.05)";
export const BG_BLUE_95 = "var(--bg-blue-95)";
export const WARM_BLACK_95 = "var(--warm-black-95)";
export const LIME_067 = "rgba(200,255,77,0.067)";
export const LIME_125 = "rgba(200,255,77,0.125)";
export const LIME_133 = "rgba(200,255,77,0.133)";
export const CYAN_251 = "rgba(34,211,238,0.251)";
export const DEEP_BLACK_2_CC = "var(--deep-black-2-cc)";
export const DEEP_BLACK_2_EE = "var(--deep-black-2-ee)";
export const LIME_BRIGHT_RGB = "200, 255, 90";
export const SLATE_MUTED = "rgb(120 130 125)";

// Legacy aliases (deprecated names, kept for compatibility)
export const VIOLET = EMERALD;
export const VIOLET_DIM = EMERALD_10;
export const VIOLET_GLOW = EMERALD_30;

/* ------------------------------------------------------------------ */
/*  Accent themes (user-selectable brand hue)                           */
/* ------------------------------------------------------------------ */
/**
 * Each accent resolves to one of two token sets, selected by the active mode:
 *
 *  - `dark`  — bright, saturated hues for near-black surfaces.
 *  - `light` — darkened hues so accent *text* stays legible on near-white panels.
 *
 * Design rules enforced by `accent-themes.test.ts`:
 *  1. `primary` is the fill for solid primary surfaces; `primaryForeground` sits on it.
 *  2. `onAccent` sits on `ctaFrom`/`ctaTo` (the CTA gradient) and on accent fills.
 *  3. Light-mode hues are the *text* variants and must clear 4.5:1 on white cards.
 *  4. `lime` in dark mode is byte-identical to the historical values so the
 *     default theme is visually unchanged.
 *
 * The `--lime-*` / `--cta-*` alpha scales above are intentionally NOT part of this
 * system: they stay lime so glass/tint surfaces keep their current weight.
 */
export type AccentId =
  | "lime"
  | "emerald"
  | "cyan"
  | "violet"
  | "amber"
  | "red"
  | "orange"
  | "blue";

export type AccentTokenSet = {
  /** Solid primary surface fill (buttons, logo tile, selected chips). */
  primary: string;
  /** Text/icon color placed on top of `primary`. */
  primaryForeground: string;
  /** Focus ring + focus-visible outline color. */
  ring: string;
  /** Accent text/icon color (links, labels, icons) for the active mode. */
  accentForeground: string;
  /** Tinted surface for accent backgrounds (low alpha). */
  accentSoft: string;
  /** Very low-alpha accent wash for decorative backdrops. */
  accentMuted: string;
  /** Accent border color for outlined accent controls. */
  accentBorder: string;
  /** Text/icon color placed on `ctaFrom`/`ctaTo` gradient fills. */
  onAccent: string;
  /** CTA gradient start stop. */
  ctaFrom: string;
  /** CTA gradient end stop. */
  ctaTo: string;
  /** Primary data-series color for charts. */
  chart1: string;
  /**
   * Accent tint ramp, derived from `primary` at the listed alpha percentages and
   * emitted as `--accent-04` … `--accent-50`. Replaces the legacy
   * `--emerald-*` ramp so components that tinted themselves with emerald now
   * follow the user's accent.
   */
} & { [K in AccentAlphaStep as `alpha${K}`]: string };

/**
 * Alpha percentages for the accent tint ramp, zero-padded so they match the
 * legacy `--emerald-XX` custom property names they replace.
 */
export const ACCENT_ALPHA_STEPS = [
  "04",
  "06",
  "08",
  "10",
  "12",
  "15",
  "20",
  "25",
  "30",
  "40",
  "50",
] as const;

export type AccentAlphaStep = (typeof ACCENT_ALPHA_STEPS)[number];

const HEX_RGB: Record<string, [number, number, number]> = {};

/** Build one `rgba()` tint of a solid accent hex. */
function withAlpha(hex: string, step: AccentAlphaStep): string {
  const key = hex.toUpperCase();
  let rgb = HEX_RGB[key];
  if (!rgb) {
    const h = key.replace("#", "");
    rgb = [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
    HEX_RGB[key] = rgb;
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Number(step) / 100})`;
}

/** The full alpha ramp for a solid accent color, keyed to match `AccentTokenSet`. */
function alphaRamp(
  hex: string,
): { [K in AccentAlphaStep as `alpha${K}`]: string } {
  return Object.fromEntries(
    ACCENT_ALPHA_STEPS.map((step) => [`alpha${step}`, withAlpha(hex, step)]),
  ) as { [K in AccentAlphaStep as `alpha${K}`]: string };
}

export type AccentTheme = {
  /** Human-readable label for the settings selector. */
  label: string;
  /** Swatch preview color, drawn from the dark token set. */
  swatch: string;
  dark: AccentTokenSet;
  light: AccentTokenSet;
};

export const ACCENT_IDS: AccentId[] = [
  "lime",
  "emerald",
  "cyan",
  "violet",
  "amber",
  "red",
  "orange",
  "blue",
];

export const DEFAULT_ACCENT: AccentId = "lime";

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && (ACCENT_IDS as string[]).includes(value);
}

export const accentThemes: Record<AccentId, AccentTheme> = {
  lime: {
    label: "Lime",
    swatch: "#C8FF5A",
    dark: {
      primary: "#C8FF5A",
      ...alphaRamp("#C8FF5A"),
      primaryForeground: "#050505",
      ring: "#C8FF5A",
      accentForeground: "#C8FF5A",
      accentSoft: "rgba(200, 255, 90, 0.12)",
      accentMuted: "rgba(200, 255, 90, 0.05)",
      accentBorder: "rgba(200, 255, 90, 0.28)",
      onAccent: "#0A0C0A",
      ctaFrom: "#C7F252",
      ctaTo: "#A8D43A",
      chart1: "#C8FF5A",
    },
    light: {
      primary: "#4D7C0F",
      ...alphaRamp("#4D7C0F"),
      primaryForeground: "#FFFFFF",
      ring: "#4D7C0F",
      accentForeground: "#4D7C0F",
      accentSoft: "rgba(77, 124, 15, 0.10)",
      accentMuted: "rgba(77, 124, 15, 0.05)",
      accentBorder: "rgba(77, 124, 15, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#C7F252",
      ctaTo: "#A8D43A",
      chart1: "#4D7C0F",
    },
  },
  emerald: {
    label: "Emerald",
    swatch: "#34D399",
    dark: {
      primary: "#34D399",
      ...alphaRamp("#34D399"),
      primaryForeground: "#050505",
      ring: "#34D399",
      accentForeground: "#34D399",
      accentSoft: "rgba(52, 211, 153, 0.12)",
      accentMuted: "rgba(52, 211, 153, 0.05)",
      accentBorder: "rgba(52, 211, 153, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#10B981",
      ctaTo: "#059669",
      chart1: "#34D399",
    },
    light: {
      primary: "#047857",
      ...alphaRamp("#047857"),
      primaryForeground: "#FFFFFF",
      ring: "#047857",
      accentForeground: "#047857",
      accentSoft: "rgba(4, 120, 87, 0.10)",
      accentMuted: "rgba(4, 120, 87, 0.05)",
      accentBorder: "rgba(4, 120, 87, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#10B981",
      ctaTo: "#059669",
      chart1: "#047857",
    },
  },
  cyan: {
    label: "Cyan",
    swatch: "#22D3EE",
    dark: {
      primary: "#22D3EE",
      ...alphaRamp("#22D3EE"),
      primaryForeground: "#050505",
      ring: "#22D3EE",
      accentForeground: "#22D3EE",
      accentSoft: "rgba(34, 211, 238, 0.12)",
      accentMuted: "rgba(34, 211, 238, 0.05)",
      accentBorder: "rgba(34, 211, 238, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#06B6D4",
      ctaTo: "#0891B2",
      chart1: "#22D3EE",
    },
    light: {
      primary: "#0E7490",
      ...alphaRamp("#0E7490"),
      primaryForeground: "#FFFFFF",
      ring: "#0E7490",
      accentForeground: "#0E7490",
      accentSoft: "rgba(14, 116, 144, 0.10)",
      accentMuted: "rgba(14, 116, 144, 0.05)",
      accentBorder: "rgba(14, 116, 144, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#06B6D4",
      ctaTo: "#0891B2",
      chart1: "#0E7490",
    },
  },
  violet: {
    label: "Violet",
    swatch: "#A78BFA",
    dark: {
      primary: "#A78BFA",
      ...alphaRamp("#A78BFA"),
      primaryForeground: "#050505",
      ring: "#A78BFA",
      accentForeground: "#A78BFA",
      accentSoft: "rgba(167, 139, 250, 0.12)",
      accentMuted: "rgba(167, 139, 250, 0.05)",
      accentBorder: "rgba(167, 139, 250, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#8B5CF6",
      ctaTo: "#7C6CF0",
      chart1: "#A78BFA",
    },
    light: {
      primary: "#6D28D9",
      ...alphaRamp("#6D28D9"),
      primaryForeground: "#FFFFFF",
      ring: "#6D28D9",
      accentForeground: "#6D28D9",
      accentSoft: "rgba(109, 40, 217, 0.10)",
      accentMuted: "rgba(109, 40, 217, 0.05)",
      accentBorder: "rgba(109, 40, 217, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#8B5CF6",
      ctaTo: "#7C6CF0",
      chart1: "#6D28D9",
    },
  },
  amber: {
    label: "Amber",
    swatch: "#FBBF24",
    dark: {
      primary: "#FBBF24",
      ...alphaRamp("#FBBF24"),
      primaryForeground: "#050505",
      ring: "#FBBF24",
      accentForeground: "#FBBF24",
      accentSoft: "rgba(251, 191, 36, 0.12)",
      accentMuted: "rgba(251, 191, 36, 0.05)",
      accentBorder: "rgba(251, 191, 36, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#F59E0B",
      ctaTo: "#D97706",
      chart1: "#FBBF24",
    },
    light: {
      primary: "#B45309",
      ...alphaRamp("#B45309"),
      primaryForeground: "#FFFFFF",
      ring: "#B45309",
      accentForeground: "#B45309",
      accentSoft: "rgba(180, 83, 9, 0.10)",
      accentMuted: "rgba(180, 83, 9, 0.05)",
      accentBorder: "rgba(180, 83, 9, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#F59E0B",
      ctaTo: "#D97706",
      chart1: "#B45309",
    },
  },
  red: {
    label: "Red",
    swatch: "#FB7185",
    dark: {
      primary: "#FB7185",
      ...alphaRamp("#FB7185"),
      primaryForeground: "#050505",
      ring: "#FB7185",
      accentForeground: "#FB7185",
      accentSoft: "rgba(251, 113, 133, 0.12)",
      accentMuted: "rgba(251, 113, 133, 0.05)",
      accentBorder: "rgba(251, 113, 133, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#EF4444",
      ctaTo: "#E5484D",
      chart1: "#FB7185",
    },
    light: {
      primary: "#B91C1C",
      ...alphaRamp("#B91C1C"),
      primaryForeground: "#FFFFFF",
      ring: "#B91C1C",
      accentForeground: "#B91C1C",
      accentSoft: "rgba(185, 28, 28, 0.10)",
      accentMuted: "rgba(185, 28, 28, 0.05)",
      accentBorder: "rgba(185, 28, 28, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#EF4444",
      ctaTo: "#E5484D",
      chart1: "#B91C1C",
    },
  },
  orange: {
    label: "Orange",
    swatch: "#FF8A4C",
    dark: {
      primary: "#FF8A4C",
      ...alphaRamp("#FF8A4C"),
      primaryForeground: "#050505",
      ring: "#FF8A4C",
      accentForeground: "#FF8A4C",
      accentSoft: "rgba(255, 138, 76, 0.12)",
      accentMuted: "rgba(255, 138, 76, 0.05)",
      accentBorder: "rgba(255, 138, 76, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#FF6B35",
      ctaTo: "#EA580C",
      chart1: "#FF8A4C",
    },
    light: {
      primary: "#C2410C",
      ...alphaRamp("#C2410C"),
      primaryForeground: "#FFFFFF",
      ring: "#C2410C",
      accentForeground: "#C2410C",
      accentSoft: "rgba(194, 65, 12, 0.10)",
      accentMuted: "rgba(194, 65, 12, 0.05)",
      accentBorder: "rgba(194, 65, 12, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#FF6B35",
      ctaTo: "#EA580C",
      chart1: "#C2410C",
    },
  },
  blue: {
    label: "Blue",
    swatch: "#60A5FA",
    dark: {
      primary: "#60A5FA",
      ...alphaRamp("#60A5FA"),
      primaryForeground: "#050505",
      ring: "#60A5FA",
      accentForeground: "#60A5FA",
      accentSoft: "rgba(96, 165, 250, 0.12)",
      accentMuted: "rgba(96, 165, 250, 0.05)",
      accentBorder: "rgba(96, 165, 250, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#3B82F6",
      ctaTo: "#2F79EE",
      chart1: "#60A5FA",
    },
    light: {
      primary: "#1D4ED8",
      ...alphaRamp("#1D4ED8"),
      primaryForeground: "#FFFFFF",
      ring: "#1D4ED8",
      accentForeground: "#1D4ED8",
      accentSoft: "rgba(29, 78, 216, 0.10)",
      accentMuted: "rgba(29, 78, 216, 0.05)",
      accentBorder: "rgba(29, 78, 216, 0.30)",
      onAccent: "#0A0C0A",
      ctaFrom: "#3B82F6",
      ctaTo: "#2F79EE",
      chart1: "#1D4ED8",
    },
  },
};

/** CSS custom property name emitted for a given token key. */
export const ACCENT_CSS_VARS: Record<keyof AccentTokenSet, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  ring: "--ring",
  accentForeground: "--accent-foreground",
  accentSoft: "--accent-soft",
  accentMuted: "--accent-muted",
  accentBorder: "--accent-border",
  onAccent: "--on-accent",
  ctaFrom: "--cta-from",
  ctaTo: "--cta-to",
  chart1: "--chart-1",
  ...(Object.fromEntries(
    ACCENT_ALPHA_STEPS.map((step) => [`alpha${step}`, `--accent-${step}`]),
  ) as Record<`alpha${AccentAlphaStep}`, string>),
};
