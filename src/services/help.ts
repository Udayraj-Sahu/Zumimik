import type { FaqItem } from "@/lib/types/help";

/** Bundled, authored FAQ content (no backend endpoint exists for it). */
export async function getFaqItems(): Promise<FaqItem[]> {
  const { FAQ_ITEMS } = await import("@/lib/content/faq");
  return FAQ_ITEMS;
}

/**
 * The running build's real version info. Native: read from the installed app (Capacitor App.getInfo()).
 * Web: the package version injected at build time (NEXT_PUBLIC_APP_VERSION). Never a hardcoded literal.
 */
export async function getAppInfo(): Promise<{ version: string; platform: string; buildNumber: string }> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      const platform = Capacitor.getPlatform();
      return { version: info.version, platform: platform === "android" ? "Android app" : platform === "ios" ? "iOS app" : platform, buildNumber: info.build };
    }
  } catch {
    // fall through to the web values
  }
  return { version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown", platform: "Web", buildNumber: "n/a" };
}
