import { db } from "@/services/offline/db";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useSprintStore } from "@/stores/sprint-store";
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
import { clearImpressionQueue } from "@/services/ads";
import { allLearnerKeys } from "@/lib/learning/storage-keys";

const STORAGE_KEYS = [
  "zuzumik-auth",
  "zuzumik-walkthrough-v2",
  "zuzumik-rate",
  "zuzumik-onboarding",
  "zuzumik-plan",
  "zuzumik-resume",
  "zuzumik-settings",
  "zuzumik-habits",
  "zuzumik-referral",
];

export async function resetAppState(): Promise<void> {
  useAuthStore.getState().logout();
  useOnboardingStore.getState().reset();
  useSprintStore.getState().reset();
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

  // The ad impression queue is not a store (its tokens belong to the signed-in learner), so it is cleared here, not via STORAGE_KEYS.
  clearImpressionQueue();

  queryClient.clear();
}

/**
 * Account deletion: everything this device holds for the signed-in learner goes. Logout and an expired session (resetAppState)
 * deliberately keep the queued, unsynced events and the learner's psychometric data, tagged by user, so work done offline is never
 * lost and the same learner can sign back in; deleting the account is the one case where that data must not outlive it.
 * The user id is read BEFORE the sign-out clears it.
 */
export async function purgeUserData(): Promise<void> {
  const userId = useAuthStore.getState().user?.id ?? null;
  await resetAppState();
  if (userId) {
    for (const key of allLearnerKeys(userId)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore storage access errors */
      }
    }
    try {
      await db.eventQueue.where("userId").equals(userId).delete();
      await db.masteryHistory.where("userId").equals(userId).delete();
    } catch {
      /* ignore dexie failures */
    }
  }
  // Anything left without an owner (a batch queued before sign-in existed) is cleared too.
  try {
    await db.eventQueue.filter((b) => !b.userId).delete();
  } catch {
    /* ignore dexie failures */
  }
}