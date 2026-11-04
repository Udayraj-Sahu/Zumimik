"use client";

import { Bell, CalendarClock, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import styles from "./trial-timeline.module.css";
import { ReviewCarousel } from "@/components/onboarding/slides/review-carousel";

export type TrialStepIcon = "lock" | "bell" | "calendar";

export interface TrialStep {
  /** Short milestone, e.g. "Today". */
  title: string;
  /** One-line detail under the milestone. */
  hint: string;
  icon: TrialStepIcon;
}

export const TRIAL_STEPS: TrialStep[] = [
  { title: "Free trial starts now", hint: "Full access unlocked", icon: "lock" },
  { title: "Reminder in 5 days", hint: "We’ll email you first", icon: "bell" },
  { title: "First payment in 7 days", hint: "Billed automatically", icon: "calendar" },
];

const STEP_ICONS: Record<TrialStepIcon, LucideIcon> = {
  lock: Lock,
  bell: Bell,
  calendar: CalendarClock,
};

/**
 * The 7-day trial timeline for the Pitch intro: compact three-step milestones,
 * the cancel-before readout and the shared review carousel along the bottom. It
 * is a `full` slide, so this card owns its surface; on wide screens the
 * timeline and the details sit side by side and everything stacks on mobile.
 */
export default function TrialTimeline({
  steps = TRIAL_STEPS,
  cancelBy = "Oct 28",
}: {
  steps?: TrialStep[];
  /** Last moment to cancel before the first charge, e.g. "Oct 28". */
  cancelBy?: string;
}) {
  return (
    <section className={styles.card} aria-labelledby="trial-timeline-title">
      <h2 id="trial-timeline-title" className={styles.heading}>
        Subscribe when it works!
      </h2>

      <div className={styles.body}>
        <div className={styles.timeline}>
          {steps.length === 3 && (
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} />
            </span>
          )}

          <ol className={styles.steps} aria-label="How the free trial works">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.icon] ?? Lock;
              return (
                <li key={step.title} className={styles.step} data-now={i === 0 ? "true" : undefined}>
                  <span className={styles.node} aria-hidden="true">
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <span className={styles.stepLabel}>{step.title}</span>
                  <span className={styles.stepHint}>{step.hint}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={styles.details}>
          <ul className={styles.list} aria-label="Trial details">
            <li>
              <span className={styles.dot} aria-hidden="true" />
              Today: every drill, mock and analysis unlocked.
            </li>
            <li>
              <span className={styles.dot} aria-hidden="true" />
              In 5 days: a heads-up email before anything renews.
            </li>
            <li>
              <span className={styles.dot} aria-hidden="true" />
              In 7 days: billed automatically unless you cancel before{" "}
              <strong className={styles.strong}>{cancelBy}</strong>.
            </li>
          </ul>
        </div>
      </div>

      <ReviewCarousel className={styles.reviews} seconds={28} showSummary={false} compact />
    </section>
  );
}
