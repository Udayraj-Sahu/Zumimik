"use client";

import { HowItWorks } from "@/components/onboarding/slides/how-it-works";

export function Join2() {
  return (
    <main className="card h-full" style={{ background: "var(--card)", padding: 0 }}>
      <div className="h-full w-full">
        <HowItWorks />
      </div>
    </main>
  );
}

export default Join2;
