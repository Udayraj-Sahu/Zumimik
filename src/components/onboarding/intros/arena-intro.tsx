"use client";

import { IntroCarousel, useArenaIntroSlides } from "@/components/onboarding/intros/intro-carousel";

/**
 * Arena intro — shown when the target exam is later this year. Renders the
 * shared intro carousel with the full Arena slide set in the split (side-by-
 * side tiers + carousel) arrangement on wide screens, stacked below.
 */
export function ArenaIntro({
  onClose,
  onSkip,
  preloaded = false,
}: {
  onClose: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
}) {
  const { slides, lanes } = useArenaIntroSlides();

  return (
    <IntroCarousel
      slides={slides}
      lanesCount={lanes.length}
      onClose={onClose}
      onSkip={onSkip}
      preloaded={preloaded}
      titleId="arena-hook-title"
      layout="split"
    />
  );
}
