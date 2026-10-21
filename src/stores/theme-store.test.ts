import { beforeEach, describe, expect, it } from "vitest";

import { ACCENT_IDS, DEFAULT_ACCENT, isAccentId } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";

const STORAGE_KEY = "zuzumik-theme";

function readPersisted(): { state?: Record<string, unknown> } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePersisted(value: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function mountScope(id: string): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-theme-scope", "");
  el.setAttribute("data-testid", id);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  useThemeStore.getState().reset();
});

describe("theme-store defaults", () => {
  it("defaults to dark mode with the lime accent", () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe("dark");
    expect(state.accent).toBe("lime");
    expect(DEFAULT_ACCENT).toBe("lime");
  });

  it("reset() returns both axes to their defaults", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("violet");
    useThemeStore.getState().reset();

    const state = useThemeStore.getState();
    expect(state.theme).toBe("dark");
    expect(state.accent).toBe("lime");
  });
});

describe("mode and accent are independent", () => {
  it("setAccent does not change the mode", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("cyan");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().accent).toBe("cyan");

    useThemeStore.getState().setTheme("dark");
    expect(useThemeStore.getState().accent).toBe("cyan");
  });

  it("setTheme does not change the accent", () => {
    useThemeStore.getState().setAccent("amber");
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().accent).toBe("amber");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("toggleTheme flips only the mode", () => {
    useThemeStore.getState().setAccent("red");
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().accent).toBe("red");

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(useThemeStore.getState().accent).toBe("red");
  });

  it("setAccent is idempotent and accepts every supported accent", () => {
    for (const accent of ACCENT_IDS) {
      useThemeStore.getState().setAccent(accent);
      expect(useThemeStore.getState().accent).toBe(accent);
    }
  });
});

describe("persistence", () => {
  it("persists the accent alongside the mode", () => {
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("orange");

    const persisted = readPersisted();
    expect(persisted?.state?.accent).toBe("orange");
    expect(persisted?.state?.theme).toBe("light");
  });

  it("keeps the storage key stable", () => {
    expect(useThemeStore.persist.getOptions().name).toBe(STORAGE_KEY);
  });
});

describe("validation and migration", () => {
  it("falls back to lime when the persisted accent is unknown", () => {
    writePersisted({ state: { theme: "dark", accent: "chartreuse" }, version: 0 });
    useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().accent).toBe("lime");
  });

  it("falls back to dark when the persisted mode is unknown", () => {
    writePersisted({ state: { theme: "sepia", accent: "violet" }, version: 0 });
    useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().theme).toBe("dark");
    // The valid accent is preserved rather than discarded with the invalid mode.
    expect(useThemeStore.getState().accent).toBe("violet");
  });

  it("survives corrupt JSON without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(() => useThemeStore.persist.rehydrate()).not.toThrow();
    expect(useThemeStore.getState().accent).toBe(DEFAULT_ACCENT);
  });

  it("migrates a legacy payload that only has a mode", () => {
    writePersisted({ state: { theme: "light" }, version: 0 });
    useThemeStore.persist.rehydrate();

    const state = useThemeStore.getState();
    expect(state.theme).toBe("light");
    expect(state.accent).toBe("lime");
  });

  it("migrates a legacy payload with no state at all", () => {
    writePersisted({ version: 0 });
    useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(useThemeStore.getState().accent).toBe("lime");
  });
});

describe("DOM application", () => {
  it("applies the light class and accent attribute to every themed scope", () => {
    const a = mountScope("a");
    const b = mountScope("b");

    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("violet");

    for (const el of [a, b]) {
      expect(el.classList.contains("light")).toBe(true);
      expect(el.getAttribute("data-accent")).toBe("violet");
    }
  });

  it("removes the light class but keeps the accent when switching back to dark", () => {
    const el = mountScope("a");
    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("cyan");
    useThemeStore.getState().setTheme("dark");

    expect(el.classList.contains("light")).toBe(false);
    expect(el.getAttribute("data-accent")).toBe("cyan");
  });

  it("scopes newly mounted dialogs to the current accent", () => {
    useThemeStore.getState().setAccent("emerald");
    // A dialog portal mounts after the accent was chosen; rehydration applies it.
    const el = mountScope("late");
    useThemeStore.persist.rehydrate();
    expect(el.getAttribute("data-accent")).toBe("emerald");
  });

  it("scopes a portal that mounts later with no rehydrate call", async () => {
    useThemeStore.getState().setAccent("emerald");
    useThemeStore.getState().setTheme("light");

    // The onboarding/duel/paywall portals render after hydration. Nothing
    // re-runs the sweep for them, so without the MutationObserver this scope
    // stays bare: the `.light[data-accent="<id>"]` block never matches and
    // --primary falls back to the dark :root accent on a light surface.
    const el = mountScope("portal");

    // MutationObserver callbacks are microtask-queued.
    await Promise.resolve();

    expect(el.getAttribute("data-accent")).toBe("emerald");
    expect(el.classList.contains("light")).toBe(true);
  });

  it("scopes a nested scope inside a portal that mounts later", async () => {
    useThemeStore.getState().setAccent("violet");

    const wrapper = document.createElement("div");
    const inner = document.createElement("div");
    inner.setAttribute("data-theme-scope", "");
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    await Promise.resolve();

    expect(inner.getAttribute("data-accent")).toBe("violet");
  });

  it("does not touch the landing page, which is outside any themed scope", () => {
    const landing = document.createElement("div");
    landing.setAttribute("data-testid", "landing");
    document.body.appendChild(landing);

    useThemeStore.getState().setAccent("red");
    useThemeStore.getState().setTheme("light");

    expect(landing.hasAttribute("data-accent")).toBe(false);
    expect(landing.classList.contains("light")).toBe(false);
  });
});

describe("isAccentId guard", () => {
  it("rejects values that are not supported accents", () => {
    expect(isAccentId("lime")).toBe(true);
    expect(isAccentId("LIGHT")).toBe(false);
    expect(isAccentId("lime ")).toBe(false);
    expect(isAccentId(null)).toBe(false);
  });
});
