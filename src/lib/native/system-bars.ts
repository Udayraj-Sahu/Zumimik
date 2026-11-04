/**
 * Mirrors `Theme` from the theme store. Declared here rather than imported so
 * this bridge stays independent of the store it is driven by.
 */
export type SystemBarMode = "light" | "dark";

type SystemBarsPlugin = {
  /**
   * `light` = light app surface, so status/navigation bar icons must be dark.
   * `dark`  = dark app surface, so the icons must be light.
   *
   * Backs `SystemBarsPlugin.java`. There is deliberately no default and no
   * per-platform constant here: the app theme is the single source of truth,
   * so the icons can never disagree with the UI.
   */
  setAppearance(options: { mode: SystemBarMode }): Promise<void>;
};

let pluginPromise: Promise<SystemBarsPlugin | null> | null = null;

function getPlugin(): Promise<SystemBarsPlugin | null> {
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/core")
      .then(({ Capacitor, registerPlugin }) => {
        // iOS owns status-bar styling through its own plist/UIViewController
        // path and has no navigation-bar icon appearance, so this bridge is
        // Android-only.
        if (
          typeof window === "undefined" ||
          !Capacitor.isNativePlatform() ||
          Capacitor.getPlatform() !== "android"
        ) {
          return null;
        }
        return registerPlugin<SystemBarsPlugin>("SystemBars");
      })
      .catch(() => null);
  }
  return pluginPromise;
}

/**
 * Mirror the web theme onto the Android system bars.
 *
 * Safe to call on every theme change and on every resume: the native side is
 * idempotent. Never throws -- if the plugin is missing or the bridge is not
 * ready yet, the bars simply keep the platform default.
 */
export async function applySystemBars(mode: SystemBarMode): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.setAppearance({ mode });
  } catch {
    /* ignore */
  }
}