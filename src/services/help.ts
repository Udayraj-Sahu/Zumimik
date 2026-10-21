import type { FaqItem } from "@/lib/types/help";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getFaqItems(): Promise<FaqItem[]> {
  if (IS_MOCK) {
    const { FAQ_ITEMS } = await import("@/lib/mock/help");
    const { delay } = await import("@/lib/mock/delay");

    await delay(150);
    return FAQ_ITEMS;
  }
  return apiGet<FaqItem[]>("/help/faq");
}

export async function getAppInfo(): Promise<{ version: string; platform: string; buildNumber: string }> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");

    await delay(100);
    return { version: "1.0.0", platform: "Web / Android APK", buildNumber: "2026.06.20" };
  }
  return apiGet<{ version: string; platform: string; buildNumber: string }>("/help/app-info");
}
