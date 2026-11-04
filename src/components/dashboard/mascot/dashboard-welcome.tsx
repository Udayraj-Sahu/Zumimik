"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useWelcomeStore } from "@/stores/welcome-store";
import { DashboardMascot, MASCOT_WALK_MS, type MascotState } from "./dashboard-mascot";
import { WelcomeCloud } from "./welcome-cloud";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

/** Short beat after the dashboard mounts before the mascot entrance starts. The
 *  dashboard only mounts this component once its data is ready, so the walk
 *  begins almost immediately instead of after a long pause. */
export const WELCOME_DELAY_MS = 250;
/** Let the mascot settle into idle before the cloud opens. */
export const WELCOME_SETTLE_MS = 200;
/** Cloud opening (scale + fade) duration. */
export const WELCOME_CLOUD_MS = 350;

type Stage = "hidden" | "delay" | "walk" | "settle" | "cloud" | "ready";

type DashboardWelcomeProps = {
  /**
   * False while a modal covers the dashboard. The welcome waits until the
   * dashboard is actually visible so the entrance is never played behind an
   * onboarding / hook sheet.
   */
  enabled: boolean;
  /** The dashboard's own welcome copy, rendered inside the cloud. */
  greeting: ReactNode;
  className?: string;
};

/**
 * Owns the "play once per session" welcome sequence and drives it stage by
 * stage so the mascot and cloud never appear together:
 *
 *   hidden -> delay (250ms) -> walk (500ms) -> settle (200ms) -> cloud (350ms) -> ready
 *
 * A `pending` {@link useWelcomeStore} status means the welcome is queued (fresh
 * sign-up or a cold app open); anything else means it already ran this session
 * and must not replay on re-render, route change or refresh. The status is
 * consumed the moment the sequence starts, and a `decidedRef` latch keeps
 * re-renders from restarting it. Reduced-motion visitors skip straight to the
 * settled state with the cloud and text visible.
 */
export function DashboardWelcome({ enabled, greeting, className }: DashboardWelcomeProps) {
  const status = useWelcomeStore((s) => s.status);
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>("hidden");
  const [cloudOpen, setCloudOpen] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const decidedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (decidedRef.current) return;

    const showNow = () => {
      setStage("ready");
      setCloudOpen(true);
      setTextVisible(true);
    };

    if (!enabled) return; // wait for the dashboard to be unobstructed
    if (reduced || prefersReducedMotionNow()) {
      decidedRef.current = true;
      useWelcomeStore.getState().consume();
      showNow();
      return;
    }

    const store = useWelcomeStore.getState();
    if (store.status !== "pending") {
      showNow();
      return;
    }

    decidedRef.current = true;
    store.consume();

    const timers = timersRef.current;
    setStage("delay");
    timers.push(
      window.setTimeout(() => {
        setStage("walk");
        timers.push(
          window.setTimeout(() => {
            setStage("settle");
            timers.push(
              window.setTimeout(() => {
                setStage("cloud");
                setCloudOpen(true);
                timers.push(
                  window.setTimeout(() => {
                    setStage("ready");
                    setTextVisible(true);
                  }, WELCOME_CLOUD_MS),
                );
              }, WELCOME_SETTLE_MS),
            );
          }, MASCOT_WALK_MS),
        );
      }, WELCOME_DELAY_MS),
    );
  }, [enabled, status, reduced]);

  const mascotState: MascotState =
    stage === "walk"
      ? "walking"
      : stage === "hidden" || stage === "delay"
        ? "before"
        : "after";
  const mascotVisible = stage === "walk" || stage === "settle" || stage === "cloud" || stage === "ready";

  return (
    <div className={cn("flex items-center gap-3 md:gap-4", className)}>
      <div
        style={{ visibility: mascotVisible ? "visible" : "hidden" }}
        aria-hidden={!mascotVisible}
      >
        <DashboardMascot state={mascotState} />
      </div>
      <WelcomeCloud revealed={cloudOpen} showText={textVisible} reduced={reduced}>
        {greeting}
      </WelcomeCloud>
    </div>
  );
}

function prefersReducedMotionNow(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
