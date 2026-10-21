import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { DEFAULT_ACCENT, isAccentId, type AccentId } from "@/lib/theme";

export type Theme = "dark" | "light";

type ThemeState = {
  /** Light/dark mode axis. Independent of `accent`. */
  theme: Theme;
  /** User-selectable brand hue. Independent of `theme`. */
  accent: AccentId;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccent: (accent: AccentId) => void;
  reset: () => void;
};

const STORAGE_KEY = "zuzumik-theme";

// `.light` is scoped to app-shell subtrees ([data-theme-scope]) so the landing
// page and onboarding/auth surfaces never flip. Everything outside those
// subtrees permanently resolves :root (dark) values. The same loop carries
// `data-accent`, which is what globals.css keys its [data-accent="<id>"] token
// blocks off, so portaled dialogs follow the user's accent too.
// `documentElement.classList` carries the `dark` class that Tailwind's
// `darkMode: "class"` keys `dark:` variants off. Portaled dialogs and toasts live
// outside every `[data-theme-scope]`, so the document root is the only ancestor
// that covers them.
function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyThemeToScopes(theme: Theme, accent: AccentId) {
  applyThemeToDocument(theme);
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-theme-scope]").forEach((el) => {
    el.classList.toggle("light", theme === "light");
    el.setAttribute("data-accent", accent);
  });
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
      if (parsed?.state?.theme === "light") return "light";
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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: readInitialTheme(),
      accent: readInitialAccent(),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setAccent: (accent) => set({ accent }),
      reset: () => set({ theme: "dark", accent: DEFAULT_ACCENT }),
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
          theme: incoming.theme === "light" ? "light" : "dark",
          accent: isAccentId(incoming.accent) ? incoming.accent : DEFAULT_ACCENT,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToScopes(state.theme, state.accent);
      },
    },
  ),
);

useThemeStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme || state.accent !== prev.accent) {
    applyThemeToScopes(state.theme, state.accent);
  }
});

// Persisted value is read synchronously at module scope, so set the root class
// immediately instead of waiting for the first rehydrate/subscription tick.
applyThemeToDocument(useThemeStore.getState().theme);

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
          node.setAttribute("data-accent", accent);
        }
        node
          .querySelectorAll<HTMLElement>("[data-theme-scope]")
          .forEach((el) => {
            el.classList.toggle("light", theme === "light");
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
