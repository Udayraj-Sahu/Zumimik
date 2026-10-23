"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver, type Config, type DriveStep } from "driver.js";
import { useThemeStore } from "@/stores/theme-store";
import "driver.js/dist/driver.css";
import "@/styles/driver-override.css";

type StartOptions = {
  steps: DriveStep[];
  config?: Omit<Config, "steps">;
};

/** driver.js portals the popover to <body>, outside the app's [data-theme-scope]
 *  wrappers, so tag it directly with the current theme class. */
function syncPopoverTheme(): void {
  const { theme, accent } = useThemeStore.getState();
  const isLight = theme === "light";
  document.querySelectorAll<HTMLElement>(".ea-tour-popover.driver-popover").forEach((el) => {
    el.setAttribute("data-theme-scope", "");
    el.setAttribute("data-accent", accent);
    el.classList.toggle("light", isLight);
    el.classList.toggle("dark", !isLight);
  });
}

export function useDriver() {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const start = useCallback(({ steps, config }: StartOptions) => {
    if (driverRef.current?.isActive()) return;
    if (typeof document === "undefined" || !document.body) return;

    driverRef.current?.destroy();
    const userOnHighlight = config?.onHighlightStarted;
    driverRef.current = driver({
      ...config,
      onHighlightStarted: (el, step, options) => {
        syncPopoverTheme();
        userOnHighlight?.(el, step, options);
      },
    });
    driverRef.current.setSteps(steps);
    driverRef.current.drive();
    syncPopoverTheme();
  }, []);

  const refresh = useCallback(() => {
    driverRef.current?.refresh();
  }, []);

  return { start, stop, refresh };
}
