"use client";

import { useEffect, useRef } from "react";
import { BG_BLACK } from "@/lib/theme";
import { usePathname } from "next/navigation";
import type { DriveStep } from "driver.js";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useWalkthroughStore } from "@/stores/walkthrough-store";
import { useTourStore } from "@/stores/tour-store";
import { useAuthStore } from "@/stores/auth-store";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { useDriver } from "@/hooks/use-driver";

const WELCOME_DELAY = 900;

function buildSteps(domainLabel: string): DriveStep[] {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  const steps: DriveStep[] = [
    {
      element: "[data-tour-continue-setup]",
      popover: {
        title: "Finish Your Setup",
        description: `Tap CONTINUE SETUP to pick your goal and tailor the app for ${domainLabel}.`,
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour-streak]",
      popover: {
        title: "Track Your Streak",
        description: "Your streak and XP live up here. Stay consistent to climb the leaderboard.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: isMobile ? "[data-tour-mobile-nav]" : "[data-tour-nav]",
      popover: {
        title: "Your navigation bar",
        description: "Tap here to move between Home, Learn, Play, and Settings — and open More for everything else.",
        side: isMobile ? "top" : "right",
        align: "start",
      },
    },
  ];

  if (!isMobile) {
    steps.push(
      {
        element: "[data-tour-start-sprint]",
        popover: {
          title: "Start a Sprint",
          description:
            "Tap 'START SPRINT' to begin a timed challenge that sharpens your speed and accuracy.",
          side: "left",
          align: "center",
        },
      },
      {
        popover: {
          title: "You're Ready!",
          description: "Finish setup and start your first sprint. See you in the arena!",
          showProgress: true,
        },
      },
    );
  }

  return steps;
}

export function Walkthrough() {
  const pathname = usePathname();
  const complete = useWalkthroughStore((s) => s.complete);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  // Only an account created on this device is toured, once. A returning user signing in never sees it.
  const isNewAccount = useTourStore((s) => !!userId && s.pending.includes(userId));
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const isOnboarded = useOnboardingStore((s) => s.isOnboarded);
  const planHookSeen = useOnboardingStore((s) => s.planHookSeen);
  const arenaHookSeen = useOnboardingStore((s) => s.arenaHookSeen);
  const pitchHookSeen = useOnboardingStore((s) => s.pitchHookSeen);
  const temporalWindow = useOnboardingStore((s) => s.temporalWindow);
  const { start, refresh } = useDriver();

  const domainLabel = DOMAIN_LABELS[targetExam] || "Zuzumik";
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || pathname !== "/dashboard") return;
    if (!isAuthenticated || !isNewAccount) return;

    const isVedic = targetExam === "vedic-math";
    const eligibleExam = !!targetExam && !isVedic;
    const hooksPending =
      isOnboarded &&
      (!planHookSeen ||
        (eligibleExam && !arenaHookSeen && temporalWindow === "this_year") ||
        (eligibleExam &&
          !pitchHookSeen &&
          (temporalWindow === "whenever" || temporalWindow === "not_sure")));
    if (hooksPending) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      startedRef.current = true;
      start({
        steps: buildSteps(domainLabel),
        config: {
          animate: true,
          duration: 350,
          overlayColor: BG_BLACK,
          overlayOpacity: 0.72,
          smoothScroll: true,
          allowScroll: false,
          overlayClickBehavior: "close",
          popoverClass: "ea-tour-popover",
          showProgress: true,
          progressText: "{{current}} / {{total}}",
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Start Training",
          skipMissingElement: true,
          onDestroyed: () => {
            complete();
            useTourStore.getState().finish(userId);
            startedRef.current = false;
          },
        },
      });
      setTimeout(refresh, 250);
    }, WELCOME_DELAY);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    pathname,
    isAuthenticated,
    isNewAccount,
    userId,
    isOnboarded,
    planHookSeen,
    arenaHookSeen,
    pitchHookSeen,
    temporalWindow,
    targetExam,
    domainLabel,
    start,
    refresh,
    complete,
  ]);

  return null;
}
