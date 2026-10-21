import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { resetAppState } from "@/lib/platform";
import { db } from "@/services/offline/db";
import { useAdaptiveStore } from "@/stores/adaptive-store";
import { useAuthStore } from "@/stores/auth-store";
import { useHabitStore } from "@/stores/habit-store";
import { useNetworkStore } from "@/stores/network-store";
import { DEFAULT_RECLAIM_CONFIGS, useOnboardingStore } from "@/stores/onboarding-store";
import { usePaywallStore } from "@/stores/paywall-store";
import { usePlanStore } from "@/stores/plan-store";
import { useRateStore } from "@/stores/rate-store";
import { useReferralStore } from "@/stores/referral-store";
import { useResumeStore } from "@/stores/resume-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useSprintStore } from "@/stores/sprint-store";
import { useTemplateStore } from "@/stores/template-store";
import { useThemeStore } from "@/stores/theme-store";
import { useToastStore } from "@/stores/toast-store";
import { useWalkthroughStore } from "@/stores/walkthrough-store";

const DAY = 86_400_000;
const THEME_KEY = "zuzumik-theme";
const STORES_DIR = path.join(process.cwd(), "src", "stores");

const PERSISTED_STORES = [
  useAuthStore,
  useWalkthroughStore,
  usePlanStore,
  useResumeStore,
  useSettingsStore,
  useAdaptiveStore,
  useHabitStore,
  useReferralStore,
  useOnboardingStore,
  useRateStore,
  useThemeStore,
] as const;

function persistedNamesFromHooks(): string[] {
  return PERSISTED_STORES.map((s) => s.persist.getOptions().name as string);
}

function persistedNamesFromFiles(): string[] {
  const names: string[] = [];
  const files = fs
    .readdirSync(STORES_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const file of files) {
    const src = fs.readFileSync(path.join(STORES_DIR, file), "utf8");
    if (!src.includes("persist(")) continue;
    const named = src.match(/persist\s*\([\s\S]*?\)\s*,\s*{\s*name:\s*"([^"]+)"/);
    if (named) {
      names.push(named[1]);
    } else if (file === "theme-store.ts") {
      names.push(THEME_KEY);
    }
  }
  return names;
}

function resetKeysFromSource(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "platform", "reset-app-state.ts"), "utf8");
  const block = src.match(/const STORAGE_KEYS = \[([\s\S]*?)\];/);
  expect(block).toBeTruthy();
  return [...(block![1].matchAll(/"([^"]+)"/g))].map((m) => m[1]);
}

function readStorage(key: string): { state: Record<string, unknown>; version?: number } | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as { state: Record<string, unknown>; version?: number };
}

function snapshotStorage(): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    map.set(key, localStorage.getItem(key)!);
  }
  return map;
}

function restoreStorage(map: Map<string, string>): void {
  localStorage.clear();
  for (const [key, value] of map) localStorage.setItem(key, value);
}

function wipeStoresInMemory(): void {
  useAuthStore.getState().logout();
  useSettingsStore.getState().reset();
  usePlanStore.getState().reset();
  useRateStore.getState().reset();
  useWalkthroughStore.getState().reset();
  useResumeStore.getState().reset();
  useAdaptiveStore.getState().reset();
  useReferralStore.getState().reset();
  useOnboardingStore.getState().reset();
  useHabitStore.getState().reset();
  useThemeStore.getState().reset();
}

function authData() {
  const s = useAuthStore.getState();
  return {
    user: s.user,
    token: s.token,
    refreshToken: s.refreshToken,
    isAuthenticated: s.isAuthenticated,
    isOnboarded: s.isOnboarded,
  };
}

function settingsData() {
  const s = useSettingsStore.getState();
  return { soundEnabled: s.soundEnabled, hapticEnabled: s.hapticEnabled };
}

function planData() {
  const s = usePlanStore.getState();
  return { plan: s.plan, mocksTaken: s.mocksTaken };
}

function rateData() {
  const s = useRateStore.getState();
  return { sprintCount: s.sprintCount, dismissed: s.dismissed, neverShowAgain: s.neverShowAgain };
}

function walkthroughData() {
  return { completed: useWalkthroughStore.getState().completed };
}

function resumeData() {
  return { snapshot: useResumeStore.getState().snapshot };
}

function adaptiveData() {
  return { states: useAdaptiveStore.getState().states };
}

function referralData() {
  const s = useReferralStore.getState();
  return { code: s.code, invitesSent: s.invitesSent, friendsJoined: s.friendsJoined };
}

function onboardingData() {
  const s = useOnboardingStore.getState();
  return {
    currentStep: s.currentStep,
    name: s.name,
    email: s.email,
    phone: s.phone,
    authMethod: s.authMethod,
    isOnboarded: s.isOnboarded,
    activePreps: s.activePreps,
    weekDays: s.weekDays,
    reclaimConfigs: s.reclaimConfigs,
    arenaHookSeen: s.arenaHookSeen,
    pitchHookSeen: s.pitchHookSeen,
  };
}

function habitData() {
  const s = useHabitStore.getState();
  return { habits: s.habits, logs: s.logs };
}

function themeData() {
  const s = useThemeStore.getState();
  // accent is included so the existing reset assertions below also prove the
  // accent axis is restored, not just the mode.
  return { theme: s.theme, accent: s.accent };
}

function networkData() {
  const s = useNetworkStore.getState();
  return { isOnline: s.isOnline, syncQueue: s.syncQueue };
}

function paywallData() {
  const s = usePaywallStore.getState();
  return { open: s.open, action: s.action };
}

function toastData() {
  return { toasts: useToastStore.getState().toasts };
}

function sprintData() {
  const s = useSprintStore.getState();
  return {
    status: s.status,
    currentIndex: s.currentIndex,
    answers: s.answers,
    questionStartTime: s.questionStartTime,
    sessionStartTime: s.sessionStartTime,
    timeLeft: s.timeLeft,
  };
}

function templateData() {
  const s = useTemplateStore.getState();
  return {
    visibleSteps: s.visibleSteps,
    totalSteps: s.totalSteps,
    showHint: s.showHint,
    userAnswer: s.userAnswer,
    isCorrect: s.isCorrect,
    mode: s.mode,
    templates: s.templates,
    currentIndex: s.currentIndex,
    stepProgress: s.stepProgress,
    sessionId: s.sessionId,
  };
}

const BASELINE = {
  auth: authData(),
  settings: settingsData(),
  plan: planData(),
  rate: rateData(),
  walkthrough: walkthroughData(),
  resume: resumeData(),
  adaptive: adaptiveData(),
  referral: referralData(),
  onboarding: onboardingData(),
  habit: habitData(),
  theme: themeData(),
  network: networkData(),
  paywall: paywallData(),
  toast: toastData(),
  sprint: sprintData(),
  template: templateData(),
};

async function bootCleanState(): Promise<void> {
  await resetAppState();
  useThemeStore.getState().reset();
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isOnboarded: false,
  });
  while (document.querySelector("[data-theme-scope]")) {
    document.querySelector("[data-theme-scope]")!.remove();
  }
}

beforeEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await bootCleanState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("state management edge cases", () => {
  it("1. initial state: fresh stores expose correct defaults with no persisted data", () => {
    expect(authData()).toEqual(BASELINE.auth);
    expect(settingsData()).toEqual(BASELINE.settings);
    expect(planData()).toEqual(BASELINE.plan);
    expect(rateData()).toEqual(BASELINE.rate);
    expect(walkthroughData()).toEqual(BASELINE.walkthrough);
    expect(resumeData()).toEqual(BASELINE.resume);
    expect(adaptiveData()).toEqual(BASELINE.adaptive);
    expect(referralData()).toEqual(BASELINE.referral);
    expect(onboardingData()).toEqual(BASELINE.onboarding);
    expect(habitData()).toEqual(BASELINE.habit);
    expect(themeData()).toEqual({ theme: "dark", accent: "lime" });
    expect(networkData()).toEqual(BASELINE.network);
    expect(paywallData()).toEqual(BASELINE.paywall);
    expect(toastData()).toEqual({ toasts: [] });
    expect(sprintData()).toEqual(BASELINE.sprint);
    expect(templateData()).toEqual(BASELINE.template);

    expect(useHabitStore.getState().habits).toHaveLength(5);
    expect(useHabitStore.getState().logs.length).toBeGreaterThan(0);
    expect(useOnboardingStore.getState().reclaimConfigs).toEqual(DEFAULT_RECLAIM_CONFIGS);
  });

  it("2. loading state: async actions never expose partial or premature state", async () => {
    const pending = useAuthStore.getState().login("alice@example.com", "pw");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    await pending;
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe("alice");
  });

  it("2b. loading state: transient toasts auto-dismiss after their lifetime", () => {
    vi.useFakeTimers();
    useToastStore.getState().push("success", "Saved");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("3. updated state: every mutable action updates memory and persisted storage", () => {
    useAuthStore.getState().setToken("tk-1");
    useSettingsStore.getState().setSoundEnabled(false);
    usePlanStore.getState().recordMock();
    usePlanStore.getState().recordMock();
    usePlanStore.getState().setPro();
    useRateStore.getState().increment();
    useRateStore.getState().increment();
    useRateStore.getState().increment();
    useWalkthroughStore.getState().complete();
    useOnboardingStore.getState().setAuthData({ name: "Alice", authMethod: "google" });
    useOnboardingStore.getState().finishOnboarding();
    useHabitStore.getState().toggleLog("h1", "2026-09-01");
    useReferralStore.getState().ensureCode("Alice Chen");
    useAdaptiveStore.getState().ensureState("Quant");
    useThemeStore.getState().setTheme("light");

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(readStorage("zuzumik-auth")?.state.token).toBe("tk-1");
    expect(readStorage("zuzumik-settings")?.state.soundEnabled).toBe(false);
    expect(readStorage("zuzumik-plan")?.state).toMatchObject({ plan: "pro", mocksTaken: 2 });
    expect(readStorage("zuzumik-rate")?.state.sprintCount).toBe(3);
    expect(readStorage("zuzumik-walkthrough-v2")?.state.completed).toBe(true);
    const onb = readStorage("zuzumik-onboarding")?.state;
    expect(onb?.isOnboarded).toBe(true);
    expect(onb?.authMethod).toBe("google");
    expect(useHabitStore.getState().getLogsForDate("2026-09-01")).toContain("h1");
    expect(readStorage("zuzumik-habits")?.state.logs).toHaveLength(
      useHabitStore.getState().logs.length,
    );
    expect(readStorage("zuzumik-referral")?.state.code).toMatch(/^ALIC-/);
    expect(readStorage("zuzumik-adaptive")?.state.states).toHaveProperty("Quant");
    expect(readStorage(THEME_KEY)?.state.theme).toBe("light");
  });

  it("4. reset state: each store's reset() returns it to its initial shape", () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setHapticEnabled(false);
    useSettingsStore.getState().reset();
    expect(settingsData()).toEqual(BASELINE.settings);

    usePlanStore.getState().setPro();
    usePlanStore.getState().recordMock();
    usePlanStore.getState().reset();
    expect(planData()).toEqual(BASELINE.plan);

    useRateStore.getState().increment();
    useRateStore.getState().neverShow();
    useRateStore.getState().reset();
    expect(rateData()).toEqual(BASELINE.rate);

    useWalkthroughStore.getState().complete();
    useWalkthroughStore.getState().reset();
    expect(walkthroughData()).toEqual(BASELINE.walkthrough);

    useResumeStore.getState().clearSnapshot();
    useResumeStore.getState().reset();
    expect(resumeData()).toEqual(BASELINE.resume);

    useAdaptiveStore.getState().ensureState("Quant");
    useAdaptiveStore.getState().reset();
    expect(adaptiveData()).toEqual(BASELINE.adaptive);

    useReferralStore.getState().ensureCode();
    useReferralStore.getState().markInvited();
    useReferralStore.getState().reset();
    expect(referralData()).toEqual(BASELINE.referral);

    useOnboardingStore.getState().setAuthData({ name: "A", authMethod: "google" });
    useOnboardingStore.getState().nextStep();
    useOnboardingStore.getState().reset();
    expect(onboardingData()).toEqual(BASELINE.onboarding);

    useHabitStore.getState().toggleLog("h1", "2026-09-01");
    useHabitStore.getState().reset();
    expect(habitData()).toEqual(BASELINE.habit);

    useThemeStore.getState().setTheme("light");
    useThemeStore.getState().setAccent("violet");
    useThemeStore.getState().reset();
    expect(themeData()).toEqual(BASELINE.theme);

    useNetworkStore.getState().setOnline(false);
    useNetworkStore.getState().addToQueue({ id: "m", key: "k", payload: {}, timestamp: 1 });
    useNetworkStore.getState().reset();
    expect(networkData()).toEqual(BASELINE.network);

    usePaywallStore.getState().openPaywall("mock");
    usePaywallStore.getState().reset();
    expect(paywallData()).toEqual(BASELINE.paywall);

    useSprintStore.getState().initSprint(600);
    useSprintStore.getState().reset();
    expect(sprintData()).toEqual(BASELINE.sprint);

    useTemplateStore.getState().loadTemplates([], "s");
    useTemplateStore.getState().reset();
    expect(templateData()).toEqual(BASELINE.template);
  });

  it("5. persisted state: re-hydrating from storage rebuilds the exact last state", async () => {
    useAuthStore.getState().setToken("tk-5");
    useSettingsStore.getState().setSoundEnabled(false);
    usePlanStore.getState().setPro();
    useRateStore.getState().increment();
    useWalkthroughStore.getState().complete();
    useOnboardingStore.getState().finishOnboarding();
    useThemeStore.getState().setTheme("light");

    const disk = snapshotStorage();
    wipeStoresInMemory();
    restoreStorage(disk);

    await Promise.all(PERSISTED_STORES.map((s) => s.persist.rehydrate()));

    expect(authData()).toMatchObject({ isAuthenticated: true, token: "tk-5" });
    expect(settingsData()).toEqual({ soundEnabled: false, hapticEnabled: true });
    expect(planData().plan).toBe("pro");
    expect(rateData().sprintCount).toBe(1);
    expect(walkthroughData().completed).toBe(true);
    expect(onboardingData().isOnboarded).toBe(true);
    expect(themeData().theme).toBe("light");
  });

  it("6. logout state: logout clears auth only; other slices survive until resetAppState", async () => {
    useAuthStore.getState().setToken("tk-6");
    useSettingsStore.getState().setSoundEnabled(false);
    useRateStore.getState().increment();
    useOnboardingStore.getState().finishOnboarding();

    useAuthStore.getState().logout();

    expect(authData()).toEqual({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
    });
    expect(settingsData().soundEnabled).toBe(false);
    expect(rateData().sprintCount).toBe(1);
    expect(onboardingData().isOnboarded).toBe(true);
    expect(JSON.parse(localStorage.getItem("zuzumik-auth")!)).toMatchObject({
      state: { isAuthenticated: false },
    });

    await resetAppState();
    expect(settingsData()).toEqual(BASELINE.settings);
    expect(rateData()).toEqual(BASELINE.rate);
    expect(onboardingData()).toEqual(BASELINE.onboarding);
  });

  it("7. refresh state: a full reload restores the session from persistence", async () => {
    useAuthStore.getState().setToken("tk-7");
    usePlanStore.getState().setPro();
    usePlanStore.getState().recordMock();
    useRateStore.getState().increment();
    useWalkthroughStore.getState().complete();
    useOnboardingStore.getState().finishOnboarding();
    useReferralStore.getState().ensureCode();
    useThemeStore.getState().setTheme("light");

    const disk = snapshotStorage();
    wipeStoresInMemory();
    restoreStorage(disk);

    await Promise.all(PERSISTED_STORES.map((s) => s.persist.rehydrate()));

    expect(authData()).toMatchObject({ isAuthenticated: true, token: "tk-7" });
    expect(planData()).toEqual({ plan: "pro", mocksTaken: 1 });
    expect(rateData().sprintCount).toBe(1);
    expect(walkthroughData().completed).toBe(true);
    expect(onboardingData().isOnboarded).toBe(true);
    expect(referralData().code).toBeTruthy();
    expect(themeData().theme).toBe("light");
  });

  it("8. navigation state: state survives route events and no store reads the router", () => {
    useSprintStore.getState().initSprint(600);
    useSettingsStore.getState().setSoundEnabled(false);

    window.history.pushState({}, "", "/learn");
    window.dispatchEvent(new Event("popstate"));

    expect(useSprintStore.getState().status).toBe("active");
    expect(useSprintStore.getState().timeLeft).toBe(600);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    const files = fs
      .readdirSync(STORES_DIR)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const file of files) {
      const src = fs.readFileSync(path.join(STORES_DIR, file), "utf8");
      expect(src).not.toMatch(/next[/\\]navigation/);
      expect(src).not.toMatch(/next[/\\]router/);
      expect(src).not.toContain("useRouter");
    }
  });

  it("9. stale state: legacy persisted shapes are healed; mismatched/malformed blobs are ignored", async () => {
    localStorage.setItem(
      "zuzumik-onboarding",
      JSON.stringify({ state: { isOnboarded: true, weekDays: [true, false, true] }, version: 0 }),
    );
    await useOnboardingStore.persist.rehydrate();

    const s = useOnboardingStore.getState();
    expect(s.weekDays).toHaveLength(7);
    expect(s.weekDays[0]).toBe(true);
    expect(s.weekDays[2]).toBe(true);
    expect(s.weekDays[3]).toBe(true);
    expect(s.reclaimConfigs).toEqual(DEFAULT_RECLAIM_CONFIGS);
    expect(s.arenaHookSeen).toBe(false);
    expect(s.pitchHookSeen).toBe(false);
    expect(s.isOnboarded).toBe(true);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(
      "zuzumik-settings",
      JSON.stringify({ state: { soundEnabled: false, hapticEnabled: false }, version: 999 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(useSettingsStore.getState().hapticEnabled).toBe(true);
    expect(spy).toHaveBeenCalled();

    localStorage.setItem("zuzumik-rate", JSON.stringify("garbage"));
    await useRateStore.persist.rehydrate();
    expect(useRateStore.getState().sprintCount).toBe(0);

    localStorage.setItem(
      "zuzumik-onboarding",
      JSON.stringify({ state: { isOnboarded: true }, version: 2 }),
    );
    await useOnboardingStore.persist.rehydrate();
    expect(useOnboardingStore.getState().isOnboarded).toBe(true);
    expect(useOnboardingStore.getState().arenaHookSeen).toBe(false);
  });

  it("10. race conditions: concurrent async logins end in a consistent last-write-wins state", async () => {
    vi.useFakeTimers();
    const first = useAuthStore.getState().login("alice@example.com", "pw-alice");
    const second = useAuthStore.getState().login("bob@example.com", "pw-bob");

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();

    await vi.advanceTimersByTimeAsync(300);
    await Promise.all([first, second]);

    const s = useAuthStore.getState();
    expect(s.user?.name).toBe("bob");
    expect(s.user?.email).toBe("bob@example.com");
    expect(s.token).toBe("mock-jwt-token");
    expect(s.isAuthenticated).toBe(true);
    expect(JSON.parse(localStorage.getItem("zuzumik-auth")!)).toMatchObject({
      state: { user: { name: "bob" } },
    });
  });

  it("10b. race conditions: rapid sequential writes persist the last value", () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setSoundEnabled(true);
    expect(readStorage("zuzumik-settings")?.state.soundEnabled).toBe(true);
  });

  it("11. no unnecessary global state: only serializable data is persisted, never actions", () => {
    useAuthStore.getState().setToken("tk-11");
    useSettingsStore.getState().setSoundEnabled(false);
    usePlanStore.getState().recordMock();
    useRateStore.getState().increment();
    useWalkthroughStore.getState().complete();
    useOnboardingStore.getState().finishOnboarding();
    useHabitStore.getState().toggleLog("h1", "2026-09-01");
    useReferralStore.getState().ensureCode();
    useAdaptiveStore.getState().ensureState("Quant");
    useThemeStore.getState().setTheme("light");
    useResumeStore.getState().clearSnapshot();

    for (const name of persistedNamesFromHooks()) {
      const parsed = readStorage(name);
      expect(parsed, `storage entry for ${name}`).toBeTruthy();
      expect(
        Object.values(parsed!.state).some((v) => typeof v === "function"),
        `${name} must not persist action functions`,
      ).toBe(false);
      const roundTripped = JSON.parse(JSON.stringify(parsed!.state));
      expect(roundTripped, `${name} payload must be JSON round-trip safe`).toEqual(parsed!.state);
    }
  });

  it("11b. no unnecessary global state: transient UI stores never touch localStorage", () => {
    useToastStore.getState().push("info", "hi");
    usePaywallStore.getState().openPaywall("mock");
    useNetworkStore.getState().addToQueue({ id: "m1", key: "x", payload: {}, timestamp: 1 });
    useNetworkStore.getState().setOnline(false);
    useSprintStore.getState().initSprint(600);
    useTemplateStore.getState().loadTemplates([], "s");

    for (const key of [
      "zuzumik-toast",
      "zuzumik-paywall",
      "zuzumik-network",
      "zuzumik-sprint",
      "zuzumik-template",
    ]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });

  it("12. no duplicated source of truth: one unique persist key per store", () => {
    const fromHooks = persistedNamesFromHooks();
    const fromFiles = persistedNamesFromFiles();
    expect(fromFiles.sort()).toEqual(fromHooks.sort());
    expect(new Set(fromHooks).size).toBe(fromHooks.length);
    expect(fromHooks.length).toBe(11);
  });

  it("12b. no duplicated source of truth: reset keys mirror every persisted store except theme", async () => {
    const fromHooks = persistedNamesFromHooks();
    const resetKeys = resetKeysFromSource();
    const expected = fromHooks.filter((k) => k !== THEME_KEY).sort();

    expect(resetKeys.sort()).toEqual(expected);

    useThemeStore.getState().setTheme("light");
    useAuthStore.getState().setToken("tk-12");
    await resetAppState();

    expect(useThemeStore.getState().theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).not.toBeNull();
    expect(authData()).toEqual(BASELINE.auth);
    for (const key of resetKeys) {
      expect(localStorage.getItem(key), `${key} cleared after reset`).toBeNull();
    }
  });

  it("13. store resets correctly: resetAppState restores every store and clears scratch data", async () => {
    useToastStore.setState({ toasts: [] });
    useAuthStore.getState().setToken("tk-13");
    useSettingsStore.getState().setSoundEnabled(false);
    usePlanStore.getState().setPro();
    useRateStore.getState().increment();
    useWalkthroughStore.getState().complete();
    useOnboardingStore.getState().finishOnboarding();
    useHabitStore.getState().removeHabit("h1");
    useReferralStore.getState().ensureCode();
    useAdaptiveStore.getState().ensureState("Quant");
    useNetworkStore.getState().setOnline(false);
    usePaywallStore.getState().openPaywall("mock");
    useToastStore.getState().push("error", "boom");
    useSprintStore.getState().initSprint(600);
    await db.dashboardCache.put({
      id: "scratch",
      data: { v: 1 },
      updatedAt: Date.now(),
      trustStatus: "trusted",
      ttl: DAY,
    });
    expect(await db.dashboardCache.count()).toBe(1);

    await resetAppState();

    expect(authData()).toEqual(BASELINE.auth);
    expect(settingsData()).toEqual(BASELINE.settings);
    expect(planData()).toEqual(BASELINE.plan);
    expect(rateData()).toEqual(BASELINE.rate);
    expect(walkthroughData()).toEqual(BASELINE.walkthrough);
    expect(onboardingData()).toEqual(BASELINE.onboarding);
    expect(habitData()).toEqual(BASELINE.habit);
    expect(referralData()).toEqual(BASELINE.referral);
    expect(adaptiveData()).toEqual(BASELINE.adaptive);
    expect(networkData()).toEqual(BASELINE.network);
    expect(paywallData()).toEqual(BASELINE.paywall);
    expect(sprintData()).toEqual(BASELINE.sprint);
    expect(useSprintStore.getState().lastResult).toBeNull();
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ title: "boom", type: "error" }),
    ]);
    expect(await db.dashboardCache.count()).toBe(0);
    expect(await db.feedbackQueue.count()).toBe(0);
  });

  it("14. persisted values are version-safe: migration is non-throwing for old and future versions", async () => {
    for (let v = 0; v <= 3; v++) {
      localStorage.setItem(
        "zuzumik-onboarding",
        JSON.stringify({ state: { isOnboarded: true, weekDays: [true, false] }, version: v }),
      );
      await useOnboardingStore.persist.rehydrate();
      const s = useOnboardingStore.getState();
      expect(s.weekDays).toHaveLength(7);
      expect(s.reclaimConfigs).toEqual(DEFAULT_RECLAIM_CONFIGS);
      expect(s.isOnboarded).toBe(true);
    }
  });

  it("15. sensitive data: credentials and one-time codes are never persisted", async () => {
    await useAuthStore.getState().login("alice@example.com", "super-secret-password");
    await useAuthStore.getState().loginWithFirebase("firebase-id-token", "google");

    expect(useAuthStore.getState().user).not.toHaveProperty("password");
    expect(useAuthStore.getState().user).not.toHaveProperty("idToken");
    expect(useAuthStore.getState().user).not.toHaveProperty("otp");

    const sensitive = /password|otp|pin|secret|idtoken|verif/i;
    const scan = (value: unknown, where: string) => {
      if (typeof value !== "object" || value === null) return;
      for (const [key, val] of Object.entries(value)) {
        expect(key, `sensitive field '${key}' in ${where}`).not.toMatch(sensitive);
        scan(val, `${where}.${key}`);
      }
    };

    for (const name of persistedNamesFromHooks()) {
      const parsed = readStorage(name);
      if (parsed) scan(parsed.state, name);
    }
  });
});