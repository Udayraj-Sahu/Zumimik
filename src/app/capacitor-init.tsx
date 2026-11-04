"use client";

import { useEffect, useRef } from "react";
import { setPlatform } from "@/services/device";

export function CapacitorInit() {
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    let _navDepth = 0;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        setPlatform(Capacitor.getPlatform() as "android" | "ios");
        document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();

        // Track SPA navigation depth for back button
        const origPush = history.pushState.bind(history);
        const origReplace = history.replaceState.bind(history);

        history.pushState = function (...args) {
          _navDepth++;
          return origPush(...args);
        };

        history.replaceState = function (...args) {
          return origReplace(...args);
        };

        const onPopState = () => {
          _navDepth = Math.max(0, _navDepth - 1);
        };
        window.addEventListener("popstate", onPopState);

        // Register hardware back button handler
        const { App } = await import("@capacitor/app");
        let lastBack = 0;

        await App.addListener("backButton", () => {
          if (_navDepth > 0) {
            window.history.back();
          } else {
            const now = Date.now();
            if (now - lastBack < 2000) {
              App.exitApp();
            } else {
              lastBack = now;
            }
          }
        });

        // System-bar icon appearance follows the app theme. Android has no other
        // source of truth for it: on an edge-to-edge window the OS default is
        // light (white) icons, which is right for dark mode and wrong for light
        // mode. Mirrored here rather than inside the components that toggle the
        // theme, so it covers every entry point -- settings, onboarding, a
        // preloaded intro -- without any of them having to know it exists.
        const { applySystemBars } = await import("@/lib/native/system-bars");
        const { useThemeStore } = await import("@/stores/theme-store");

        const syncSystemBars = () => {
          // Study is a warm variant of the dark axis, so it keeps light icons.
          const theme = useThemeStore.getState().theme;
          void applySystemBars(theme === "light" ? "light" : "dark");
        };

        // Covers the very first frame after the splash, where native still has
        // the launch-theme default.
        syncSystemBars();

        const unsubTheme = useThemeStore.subscribe((state, prev) => {
          if (state.theme === prev.theme) return;
          syncSystemBars();
        });

        // Android re-asserts its own bar appearance when the activity resumes,
        // so re-apply after the app comes back to the foreground.
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) syncSystemBars();
        });

        cleanupRef.current = () => {
          unsubTheme();
          history.pushState = origPush;
          history.replaceState = origReplace;
          window.removeEventListener("popstate", onPopState);
        };
      } catch {
        // Not running in Capacitor
      }
    })();

    return () => cleanupRef.current?.();
  }, []);

  return null;
}
