import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// The whole suite runs in parallel, so a cold dynamic import can take longer than the 1 s default; a wait that never succeeds still fails.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no matchMedia; the avatar engine and reduced-motion hooks rely on it.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const mql = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      dispatchEvent: () => false,
    };
    return mql as unknown as MediaQueryList;
  };
}

afterEach(() => {
  cleanup();
});
