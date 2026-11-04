"use client";
import { IS_MOCK } from "@/lib/platform";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, Play, Clock, Sparkles, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { GLASS_BG } from "@/lib/theme";
import { FEED_HERO, FEED_CATEGORIES, FEED_STORIES, FEED_VIDEOS } from "@/lib/mock/feed";


function FeedPageContent() {
  usePageMeta("Feed — Zuzumik");
  const [activeCategory, setActiveCategory] = useState<string>("Explore");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (scrollRef.current) {
      const items = scrollRef.current.querySelectorAll<HTMLElement>("[data-feed-story]");
      staggerIn(items, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" });
    }
  }, [activeCategory, staggerIn]);

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Header */}
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Compass size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">FEED</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal">Discover tips and strategies</p>
      </div>

      {/* Search bar */}
      <div ref={animateSection} data-section-index="0" className="mt-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl px-4 py-3 max-[359px]:px-3 max-[359px]:py-2.5">
          <Search size={16} className="text-muted-foreground/50 shrink-0" />
          <span className="text-[12px] text-muted-foreground/50">Search topics, tips...</span>
        </div>
      </div>

      {/* Category chips */}
      <div ref={animateSection} data-section-index="1" className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
        {FEED_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap outline-none transition-all border backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring min-h-11",
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "text-foreground/80 border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5 max-[359px]:gap-4">
        {/* Hero card */}
        <div ref={animateSection} data-section-index="2" className="keep-white relative rounded-3xl overflow-hidden h-[160px]">
          <img
            src={FEED_HERO.imageUrl}
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            <div className="relative h-full flex flex-col justify-between p-4 max-[359px]:p-3">
              <div className="flex items-center gap-2 self-start">
                <span className="flex items-center gap-1.5 bg-black/40 dark:bg-white/15 backdrop-blur-md border border-black/20 dark:border-white/25 rounded-full px-3 py-1.5 text-[11px] font-bold text-white max-[359px]:px-2.5 whitespace-nowrap">
                  <Sparkles size={10} /> {FEED_HERO.badge}
                </span>
              </div>
            <p className="text-[12px] font-bold text-white dark:text-white leading-snug drop-shadow-md">
              {FEED_HERO.title}
            </p>
          </div>
        </div>

        {/* Study tips */}
        <div ref={animateSection} data-section-index="3">
          <h2 className="text-[13px] font-bold text-foreground mb-3">Study Tips</h2>
          <div ref={scrollRef} className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-stretch md:gap-5 max-[359px]:gap-1.5">
            {FEED_STORIES.map((story) => (
              <GlassCard
                key={story.id}
                data-feed-story
                className="flex items-center gap-3.5 p-3.5 outline-none transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring max-[359px]:gap-2.5 max-[359px]:p-3"
              >
                <img
                  src={story.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 shrink-0 rounded-xl object-cover border border-white/[0.06]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-foreground truncate">
                    {story.eyebrow}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 leading-relaxed">
                    {story.subtitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock size={9} className="text-muted-foreground/40" />
                    <span className="text-micro text-muted-foreground/40 font-semibold whitespace-nowrap">
                      {story.readTime}
                    </span>
                </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Strategy videos */}
        <div ref={animateSection} data-section-index="4">
          <h2 className="text-[13px] font-bold text-foreground mb-3">Strategy Videos</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
            {FEED_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="keep-white w-[120px] shrink-0 rounded-3xl overflow-hidden border border-white/[0.06] backdrop-blur-xl h-[150px] relative outline-none transition-all active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: GLASS_BG }}
              >
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 right-2">
                  <p className="text-[11px] font-bold text-white dark:text-white leading-snug drop-shadow-md">
                    {video.label}
                  </p>
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <span className="bg-cta px-1.5 py-0.5 rounded text-[8px] font-bold text-[var(--on-accent)]">
                    {video.source}
                  </span>
                </div>
                <div className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
                  <Play size={10} fill="currentColor" className="text-white dark:text-white ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </PageContainer>
  );
}

export default function FeedPage() {
  // Real mode: the backend has no such API, so show an unavailable state, never fixtures.
  if (!IS_MOCK) return <FeatureUnavailable title="Feed" description="The feed isn't available yet. The server doesn't support it, so no posts are shown." />;
  return <FeedPageContent />;
}
