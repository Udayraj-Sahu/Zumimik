"use client";

import { ReviewCarousel } from "@/components/onboarding/slides/review-carousel";

export function Join1() {
  return (
    <main className="card h-full" style={{ background: "var(--card)", padding: 0 }}>
      <div className="h-full w-full">
        <ReviewCarousel />
      </div>
    </main>
  );
}

export default Join1;
