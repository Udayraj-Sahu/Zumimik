"use client";

import { RankSignal } from "@/components/landing/rank-signal";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { ExamPortals } from "@/components/landing/exam-portals";
import { AchievementWall } from "@/components/landing/achievement-wall";
import { ConstellationCoach } from "@/components/landing/constellation-coach";
import { EnergyTower } from "@/components/landing/energy-tower";
import { HorizonScene } from "@/components/landing/horizon-scene";
import { SectionReveal } from "@/components/landing/section-reveal";
import { SectionNav } from "@/components/landing/section-nav";
import { FloatingActions } from "@/components/landing/floating-actions";
import { ZuzumikWordmark } from "@/components/brand/zuzumik-wordmark";

export default function Home() {
  return (
    <main>
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 pointer-events-none">
        <ZuzumikMark className="size-5 opacity-60" />
        <ZuzumikWordmark className="h-4 w-auto text-primary/60" />
      </div>
      <SectionNav />
      <section id="arena">
        <RankSignal />
      </section>
      <SectionReveal><ExamPortals /></SectionReveal>
      <SectionReveal><AchievementWall /></SectionReveal>
      <SectionReveal><ConstellationCoach /></SectionReveal>
      <SectionReveal><EnergyTower /></SectionReveal>
      <section id="horizon">
        <SectionReveal className="relative" style={{ minHeight: '100dvh', height: '100dvh' }}>
          <HorizonScene />
        </SectionReveal>
      </section>
      <FloatingActions />
    </main>
  );
}
