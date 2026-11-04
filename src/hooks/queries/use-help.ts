import { useQuery } from "@tanstack/react-query";
import { getFaqItems, getAppInfo } from "@/services/help";
import type { FaqItem } from "@/lib/types/help";

type HelpData = {
  faq: FaqItem[];
  appInfo: { version: string; platform: string; buildNumber: string };
};

async function fetchHelpData(): Promise<HelpData> {
  const [faq, appInfo] = await Promise.all([getFaqItems(), getAppInfo()]);
  return { faq, appInfo };
}

export function useHelpData() {
  return useQuery<HelpData>({
    queryKey: ["help"],
    queryFn: fetchHelpData,
  });
}
