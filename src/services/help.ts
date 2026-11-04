import type { FaqItem } from "@/lib/types/help";

export async function getFaqItems(): Promise<FaqItem[]> {
  const { FAQ_ITEMS } = await import("@/lib/mock/help");
  const { delay } = await import("@/lib/mock/delay");
  await delay(150);
  return FAQ_ITEMS;
}

export async function getAppInfo(): Promise<{ version: string; platform: string; buildNumber: string }> {
  const { delay } = await import("@/lib/mock/delay");
  await delay(100);
  return { version: "1.0.0", platform: "Web / Android APK", buildNumber: "2026.06.20" };
}
