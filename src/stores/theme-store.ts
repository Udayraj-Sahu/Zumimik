import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { DEFAULT_ACCENT, isAccentId, type AccentId } from "@/lib/theme";

/**
 * Mode axis. `dark` and `light` are the app's original pair; `study` is a warm,
 * low-blue reading variant of the dark axis (light text, warm brown surfaces).
 * It deliberately stays on the dark side of every `theme === "light"` branch so
 * the existing light-only overrides are never applied to it.
 */
export type Theme = "dark" | "light" | "study";

export const THEMES: Theme[] = ["light", "dark", "study"];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as string[]).includes(value);
}

/** True only for the light theme; `study` shares the dark text palette. */
export function isLightTheme(theme: Theme): boolean {
  return theme === "light";
}

export const WARM_TINT_MIN = 0;
export const WARM_TINT_MAX = 100;
export const BRIGHTNESS_MIN = 50;
export const BRIGHTNESS_MAX = 100;

type ThemeState = {
  /** Mode axis. Independent of `accent`. */
  theme: Theme;
  /** User-selectable brand hue. Independent of `theme`. */
  accent: AccentId;
  /** 0-100 warmth overlay strength; 0 disables it. */
  warmTint: number;
  /** 50-100 screen brightness; 100 leaves the surfaces untouched. */
  brightness: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccent: (accent: AccentId) => void;
  setWarmTint: (warmTint: number) => void;
  setBrightness: (brightness: number) => void;
  reset: () => void;
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const STORAGE_KEY = "zuzumik-theme";

// `.light` is scoped to app-shell subtrees ([data-theme-scope]) so the landing
// page and onboarding/auth surfaces never flip. Everything outside those
// subtrees permanently resolves :root (dark) values. `.study` rides the same
// scopes and only re-warms the dark palette, so it needs no light-only
// overrides. The same loop carries `data-accent`, which is what globals.css
// keys its [data-accent="<id>"] token blocks off, so portaled dialogs follow the
// user's accent too.
// `documentElement.classList` carries the `dark` class that Tailwind's
// `darkMode: "class"` keys `dark:` variants off. Portaled dialogs and toasts live
// outside every `[data-theme-scope]`, so the document root is the only ancestor
// that covers them.
function applyAppearanceToDocument(theme: Theme, warmTint: number, brightness: number) {
  if (typeof document === "undefined") return;
  // `study` is a dark-axis theme, so Tailwind's `dark:` variants stay active
  // under it. Only light mode drops the class.
  document.documentElement.classList.toggle("dark", theme !== "light");
  // The screen filters live on body::before/::after in globals.css; these two
  // numbers are the whole state they need. Written as unitless strings because
  // the CSS consumes them inside calc().
  document.documentElement.style.setProperty("--app-warmth", String(warmTint));
  document.documentElement.style.setProperty("--app-brightness", String(brightness));
}

function applyThemeToScopes(
  theme: Theme,
  accent: AccentId,
  warmTint: number,
  brightness: number,
) {
  applyAppearanceToDocument(theme, warmTint, brightness);
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-theme-scope]").forEach((el) => {
    el.classList.toggle("light", theme === "light");
    el.classList.toggle("study", theme === "study");
    el.setAttribute("data-accent", accent);
  });
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
      if (isTheme(parsed?.state?.theme)) return parsed.state.theme;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

// Legacy payloads predate the accent axis, so they carry no `accent` key at all.
// Read it here (rather than in `migrate`) so the very first client render already
// has the right value and we never flash the default hue.
function readInitialAccent(): AccentId {
  if (typeof document === "undefined") return DEFAULT_ACCENT;
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { accent?: unknown } };
      if (isAccentId(parsed?.state?.accent)) return parsed.state.accent;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT;
}

// Same reasoning as `readInitialTheme`: read the persisted filters at module
// scope so the first paint already carries the user's warm tint / brightness.
function readInitialNumber(
  key: "warmTint" | "brightness",
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof document === "undefined") return fallback;
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
      return clamp(parsed?.state?.[key], min, max, fallback);
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: readInitialTheme(),
      accent: readInitialAccent(),
      warmTint: readInitialNumber("warmTint", WARM_TINT_MIN, WARM_TINT_MAX, 0),
      brightness: readInitialNumber("brightness", BRIGHTNESS_MIN, BRIGHTNESS_MAX, BRIGHTNESS_MAX),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      setAccent: (accent) => set({ accent }),
      setWarmTint: (warmTint) =>
        set({ warmTint: clamp(warmTint, WARM_TINT_MIN, WARM_TINT_MAX, 0) }),
      setBrightness: (brightness) =>
        set({ brightness: clamp(brightness, BRIGHTNESS_MIN, BRIGHTNESS_MAX, BRIGHTNESS_MAX) }),
      reset: () =>
        set({
          theme: "dark",
          accent: DEFAULT_ACCENT,
          warmTint: 0,
          brightness: BRIGHTNESS_MAX,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      // `merge` rather than `migrate`: zustand only calls `migrate` when the
      // persisted version differs from ours, so a same-version payload carrying a
      // stale or hand-edited accent would skip validation entirely. `merge` runs on
      // every hydration, which is what makes the guards below actually bite.
      // Each field is sanitized independently so one bad value never discards the
      // other axis, and a legacy payload with no `accent` key keeps the default.
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<ThemeState>;
        return {
          ...current,
          ...incoming,
          theme: isTheme(incoming.theme) ? incoming.theme : "dark",
          accent: isAccentId(incoming.accent) ? incoming.accent : DEFAULT_ACCENT,
          warmTint: clamp(incoming.warmTint, WARM_TINT_MIN, WARM_TINT_MAX, 0),
          brightness: clamp(
            incoming.brightness,
            BRIGHTNESS_MIN,
            BRIGHTNESS_MAX,
            BRIGHTNESS_MAX,
          ),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToScopes(state.theme, state.accent, state.warmTint, state.brightness);
        }
      },
    },
  ),
);

useThemeStore.subscribe((state, prev) => {
  if (
    state.theme !== prev.theme ||
    state.accent !== prev.accent ||
    state.warmTint !== prev.warmTint ||
    state.brightness !== prev.brightness
  ) {
    applyThemeToScopes(state.theme, state.accent, state.warmTint, state.brightness);
  }
});

// Persisted value is read synchronously at module scope, so set the root class
// and filter variables immediately instead of waiting for the first
// rehydrate/subscription tick.
{
  const { theme, warmTint, brightness } = useThemeStore.getState();
  applyAppearanceToDocument(theme, warmTint, brightness);
}

/**
 * Portals (dialogs, onboarding, paywall, habit tracker) mount *after*
 * hydration, so the one-shot sweep above never sees them. Without this,
 * `data-accent` is missing on those subtrees, the `.light[data-accent="<id>"]`
 * token block never matches, and `--primary` silently falls back to the dark
 * `:root` accent -- i.e. dark-mode accent text on a light surface.
 *
 * Observing is strictly a safety net: call sites that bind `data-accent`
 * directly (app-shell, dialog, onboarding-modal) are already correct, and
 * re-applying the same class/attribute is a no-op for them.
 */
if (typeof document !== "undefined") {
  const observer = new MutationObserver((mutations) => {
    const { theme, accent } = useThemeStore.getState();
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches("[data-theme-scope]")) {
          node.classList.toggle("light", theme === "light");
          node.classList.toggle("study", theme === "study");
          node.setAttribute("data-accent", accent);
        }
        node
          .querySelectorAll<HTMLElement>("[data-theme-scope]")
          .forEach((el) => {
            el.classList.toggle("light", theme === "light");
            el.classList.toggle("study", theme === "study");
            el.setAttribute("data-accent", accent);
          });
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
