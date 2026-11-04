"use client";

import { IntroCarousel, usePitchIntroSlides } from "@/components/onboarding/intros/intro-carousel";

/**
 * Pitch intro — shown when no exam date is set yet ("whenever" / "not sure").
 * It reuses the same carousel, design and interactions as the Arena intro and
 * opens on the AlgorithmPitch hook and the FirstMoveTimes chart, then the sponsor reel, the
 * trap-results panel, the stall timer and the trial timeline. Curate the Pitch
 * slide set in `usePitchIntroSlides`; the Arena flow is unaffected.
 *
 * It uses the same `split` shell as Arena, so both flows show the same
 * horizontal two-column rectangle from `md` up and stay stacked on mobile.
 */
export function PitchIntro({
  onClose,
  onSkip,
  preloaded = false,
}: {
  onClose: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
}) {
  const { slides, lanes } = usePitchIntroSlides();

  return (
    <IntroCarousel
      slides={slides}
      lanesCount={lanes.length}
      onClose={onClose}
      onSkip={onSkip}
      preloaded={preloaded}
      titleId="pitch-hook-title"
      badge="TACTICAL FOCUS"
      heading={{ lead: "Your focus", highlight: "compounds." }}
      layout="split"
    />
  );
}
