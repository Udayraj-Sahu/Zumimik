"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Compass, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { GLASS_BG } from "@/lib/theme";
import { useFeed } from "@/hooks/queries/use-feed";
import { resolveAdCta } from "@/services/ads";
import { storyHref, videoHref } from "@/services/feed";

const DEFAULT_CATEGORIES = ["Explore"];

/**
 * The Feed against GET /api/v1/feed (stories, videos and a hero card). Real mode only. The backend has no article or video route, so
 * stories and videos are read-only cards; the hero opens its `actionUrl` when that is a page this app has. Search filters what is
 * already loaded (the backend has no search).
 */
export function FeedLive() {
  usePageMeta("Feed — Zuzumik");
  const router = useRouter();
  const [category, setCategory] = useState("Explore");
  const [query, setQuery] = useState("");
  const feed = useFeed(category);

  const pages = feed.data?.pages ?? [];
  const first = pages[0];
  const categories = first?.categories.length ? first.categories : DEFAULT_CATEGORIES;
  const hero = first?.hero ?? null;
  const videos = first?.videos ?? [];
  const stories = useMemo(() => pages.flatMap((p) => p.stories), [pages]);

  const q = query.trim().toLowerCase();
  const shownStories = q
    ? stories.filter((s) => [s.title, s.eyebrow, s.subtitle].some((t) => t?.toLowerCase().includes(q)))
    : stories;
  const shownVideos = q ? videos.filter((v) => [v.label, v.source].some((t) => t.toLowerCase().includes(q))) : videos;

  const heroRoute = hero?.actionUrl ? resolveAdCta(hero.actionUrl) : null;
  const openHero = () => {
    if (heroRoute?.kind === "route") router.push(heroRoute.href);
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <Compass size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">FEED</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal">Discover tips and strategies</p>
        </div>

        <label className="mt-4 flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl px-4 py-3 max-[359px]:px-3 max-[359px]:py-2.5">
          <Search size={16} className="text-muted-foreground/50 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, tips..."
            aria-label="Search the feed"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </label>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap outline-none transition-all border backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring min-h-11",
                category === cat ? "bg-primary text-primary-foreground border-primary" : "text-foreground/80 border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {feed.isLoading && <div className="mt-5 h-40 rounded-3xl bg-white/[0.05] animate-pulse" aria-busy="true" data-testid="feed-loading" />}

        {feed.isError && !feed.isLoading && (
          <div role="alert" data-testid="feed-error" className="py-12 text-center">
            <p className="text-[12px] font-semibold text-destructive">Couldn&apos;t load the feed.</p>
            <Button onClick={() => void feed.refetch()} className="mt-3 px-5 py-2.5">
              Retry
            </Button>
          </div>
        )}

        {first && (
          <div className="mt-5 flex flex-col gap-5 max-[359px]:gap-4">
            {hero && (
              <button
                type="button"
                onClick={openHero}
                disabled={heroRoute?.kind !== "route"}
                data-testid="feed-hero"
                className="keep-white relative h-[160px] w-full overflow-hidden rounded-3xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <img src={hero.imageUrl} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                <div className="relative flex h-full flex-col justify-between p-4 max-[359px]:p-3">
                  <span className="flex items-center gap-1.5 self-start whitespace-nowrap rounded-full border border-black/20 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md dark:border-white/25 dark:bg-white/15 max-[359px]:px-2.5">
                    <Sparkles size={10} /> {hero.badge}
                  </span>
                  <p className="text-[12px] font-bold leading-snug text-white drop-shadow-md dark:text-white">{hero.title}</p>
                </div>
              </button>
            )}

            <div>
              <h2 className="text-[13px] font-bold text-foreground mb-3">Study Tips</h2>
              {shownStories.length === 0 ? (
                <p role="status" data-testid="feed-empty" className="py-8 text-center text-[12px] text-muted-foreground/60">
                  {q ? "Nothing matches your search." : "No posts in this category yet."}
                </p>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-stretch md:gap-5 max-[359px]:gap-1.5" data-testid="feed-stories">
                  {shownStories.map((story) => (
                    <Link key={story.id} href={storyHref(story.id)} className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={story.title ?? story.subtitle}>
                    <GlassCard data-feed-story className="flex h-full items-center gap-3.5 p-3.5 transition-colors group-hover:bg-white/[0.05] max-[359px]:gap-2.5 max-[359px]:p-3">
                      <img src={story.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl border border-white/[0.06] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-micro font-semibold uppercase tracking-wider text-primary/80">{story.eyebrow}</p>
                        <p className="mt-0.5 text-[12px] font-bold leading-snug text-foreground">{story.title ?? story.subtitle}</p>
                        {story.title && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/60">{story.subtitle}</p>}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Clock size={9} className="text-muted-foreground/40" />
                          <span className="whitespace-nowrap text-micro font-semibold text-muted-foreground/40">{story.readTime}</span>
                        </div>
                      </div>
                    </GlassCard>
                    </Link>
                  ))}
                </div>
              )}
              {feed.hasNextPage && !q && (
                <div className="mt-4 text-center">
                  <Button onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className="px-6 py-2.5">
                    {feed.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>

            {shownVideos.length > 0 && (
              <div data-testid="feed-videos">
                <h2 className="text-[13px] font-bold text-foreground mb-3">Strategy Videos</h2>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
                  {shownVideos.map((video) => (
                    <Link key={video.id} href={videoHref(video.id)} aria-label={`${video.label}, ${video.duration}`} className="keep-white relative block h-[150px] w-[120px] shrink-0 overflow-hidden rounded-3xl border border-white/[0.06] outline-none backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: GLASS_BG }}>
                      <img src={video.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-70" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute left-2 right-2 top-2">
                        <p className="text-[11px] font-bold leading-snug text-white drop-shadow-md dark:text-white">{video.label}</p>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
                        <span className="rounded bg-cta px-1.5 py-0.5 text-[8px] font-bold text-[var(--on-accent)]">{video.source}</span>
                        <span className="rounded bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-white">{video.duration}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
