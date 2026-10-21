import { db } from "@/services/offline/db";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useSprintStore } from "@/stores/sprint-store";
import { useAdaptiveStore } from "@/stores/adaptive-store";
import { useWalkthroughStore } from "@/stores/walkthrough-store";
import { useTemplateStore } from "@/stores/template-store";
import { useRateStore } from "@/stores/rate-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useHabitStore } from "@/stores/habit-store";
import { usePlanStore } from "@/stores/plan-store";
import { useReferralStore } from "@/stores/referral-store";
import { useResumeStore } from "@/stores/resume-store";
import { useNetworkStore } from "@/stores/network-store";
import { usePaywallStore } from "@/stores/paywall-store";
import { useWelcomeStore } from "@/stores/welcome-store";
import { queryClient } from "@/providers/query-provider";

const STORAGE_KEYS = [
  "zuzumik-auth",
  "zuzumik-walkthrough-v2",
  "zuzumik-rate",
  "zuzumik-onboarding",
  "zuzumik-plan",
  "zuzumik-resume",
  "zuzumik-settings",
  "zuzumik-adaptive",
  "zuzumik-habits",
  "zuzumik-referral",
];

export async function resetAppState(): Promise<void> {
  useAuthStore.getState().logout();
  useOnboardingStore.getState().reset();
  useSprintStore.getState().reset();
  useAdaptiveStore.getState().reset();
  useWalkthroughStore.getState().reset();
  useTemplateStore.getState().reset();
  useRateStore.getState().reset();
  useSettingsStore.getState().reset();
  useHabitStore.getState().reset();
  usePlanStore.getState().reset();
  useReferralStore.getState().reset();
  useResumeStore.getState().reset();
  useNetworkStore.getState().reset();
  usePaywallStore.getState().reset();
  useWelcomeStore.getState().reset();

  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore storage access errors */
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore storage access errors */
    }
  }

  try {
    await db.dashboardCache.clear();
    await db.feedbackQueue.clear();
  } catch {
    /* ignore dexie failures */
  }

  queryClient.clear();
}

export async function purgeUserData(): Promise<void> {
  await resetAppState();
}