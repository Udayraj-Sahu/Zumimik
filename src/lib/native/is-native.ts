type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

/**
 * Feature-detects the Capacitor runtime without importing `@capacitor/core`,
 * so the check stays out of the web bundle and works before the async native
 * init has finished.
 */
export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as CapacitorWindow).Capacitor?.isNativePlatform?.();
}
