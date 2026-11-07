"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Clock, Info, PlayCircle, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { AdaptiveCard, IconTile, ROW_CLASS } from "@/components/adaptive/adaptive-card";
import { useFeed } from "@/hooks/queries/use-feed";
import { usePageMeta } from "@/hooks/use-page-meta";
import { storyHref, videoHref, type FeedStoryData, type FeedVideoData } from "@/services/feed";
import { cn } from "@/lib/utils";

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** Every story and video the feed has, loading further pages until the one asked for turns up. */
function useFeedItems(id: string | null, kind: "story" | "video") {
  const feed = useFeed("Explore");
  const pages = feed.data?.pages ?? [];
  const stories = useMemo(() => pages.flatMap((p) => p.stories), [pages]);
  const videos = pages[0]?.videos ?? [];
  const story = kind === "story" ? stories.find((s) => s.id === id) : undefined;
  const video = kind === "video" ? videos.find((v) => v.id === id) : undefined;
  const found = kind === "story" ? !!story : !!video;
  useEffect(() => {
    if (!found && feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  }, [found, feed]);
  return { feed, stories, videos, story, video, loading: feed.isLoading || (!found && !!feed.hasNextPage) };
}

function BackBar({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard/feed"))}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-[12px] font-semibold text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
    >
      <ArrowLeft size={18} aria-hidden /> Feed
    </button>
  );
}

function NotFound({ what, error, onRetry }: { what: string; error: boolean; onRetry: () => void }) {
  const router = useRouter();
  return (
    <PageContainer className="justify-center text-center">
      <div role={error ? "alert" : "status"} data-testid="feed-detail-missing" className="mx-auto max-w-sm">
        <p className="text-[15px] font-bold text-foreground">{error ? `Couldn't load this ${what}.` : `This ${what} isn't in the feed any more.`}</p>
        <p className="mt-1 text-[12px] text-muted-foreground/60">{error ? "Check your connection and try again." : "It may have been replaced by newer posts."}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="glass" onClick={() => router.push("/dashboard/feed")}>
            Back to feed
          </Button>
          {error && <Button onClick={onRetry}>Retry</Button>}
        </div>
      </div>
    </PageContainer>
  );
}

function DetailSkeleton() {
  return (
    <PageContainer>
      <div className="mx-auto w-full animate-pulse space-y-4 md:max-w-3xl" aria-busy="true" data-testid="feed-detail-loading">
        <div className="h-11 w-24 rounded-xl bg-white/[0.05]" />
        <div className="h-52 rounded-3xl bg-white/[0.05] md:h-72" />
        <div className="h-6 w-3/4 rounded-full bg-white/[0.06]" />
        <div className="h-4 w-full rounded-full bg-white/[0.05]" />
      </div>
    </PageContainer>
  );
}

export function StoryDetail() {
  const id = useSearchParams().get("id");
  const { feed, stories, story, loading } = useFeedItems(id, "story");
  usePageMeta(story ? `${story.title ?? story.subtitle} — Zuzumik` : "Feed — Zuzumik");

  if (loading) return <DetailSkeleton />;
  if (!story) return <NotFound what="story" error={feed.isError} onRetry={() => void feed.refetch()} />;

  const date = formatDate(story.publishedAt);
  const related: FeedStoryData[] = stories.filter((s) => s.id !== story.id && (!story.category || s.category === story.category)).slice(0, 3);
  return (
    <PageContainer>
      <article className="mx-auto w-full space-y-5 md:max-w-3xl" data-testid="story-detail">
        <BackBar label="Back to the feed" />
        <div className="keep-white relative h-52 w-full overflow-hidden rounded-3xl border border-white/[0.06] md:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.thumbnailUrl} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            {story.category && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{story.category}</span>}
            <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground/55">{story.eyebrow}</span>
          </div>
          <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-foreground" data-testid="story-title">
            {story.title ?? story.subtitle}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro font-semibold text-muted-foreground/55">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} aria-hidden /> {story.readTime}
            </span>
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={11} aria-hidden /> {date}
              </span>
            )}
          </div>
        </header>

        {story.title && <p className="text-[15px] leading-[1.75] text-foreground/85">{story.subtitle}</p>}

        <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground/60" data-testid="story-body-note">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> The full article isn&apos;t published yet. This is the summary.
        </p>

        <AdaptiveCard label="Put it into practice">
          <div className="mt-3.5 flex items-center gap-3.5">
            <IconTile>
              <Sparkles size={18} />
            </IconTile>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground/70">The quickest way to make a tip stick is to use it on real questions.</p>
          </div>
          <Link
            href="/learn/practice"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-[12px] font-bold uppercase tracking-wider text-primary-foreground outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
          >
            Start practising <ChevronRight size={14} aria-hidden />
          </Link>
        </AdaptiveCard>

        {related.length > 0 && (
          <section aria-labelledby="more-stories" data-testid="story-related">
            <h2 id="more-stories" className="mb-3 text-[13px] font-bold text-foreground">
              More {story.category ? `in ${story.category}` : "to read"}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {related.map((s) => (
                <li key={s.id}>
                  <Link href={storyHref(s.id)} className={cn(ROW_CLASS, "flex items-center gap-3 outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumbnailUrl} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-foreground/90">{s.title ?? s.subtitle}</span>
                      <span className="block text-micro text-muted-foreground/55">{s.readTime}</span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PageContainer>
  );
}

export function VideoDetail() {
  const id = useSearchParams().get("id");
  const { feed, videos, video, loading } = useFeedItems(id, "video");
  usePageMeta(video ? `${video.label} — Zuzumik` : "Feed — Zuzumik");

  if (loading) return <DetailSkeleton />;
  if (!video) return <NotFound what="video" error={feed.isError} onRetry={() => void feed.refetch()} />;

  const more: FeedVideoData[] = videos.filter((v) => v.id !== video.id);
  return (
    <PageContainer>
      <article className="mx-auto w-full space-y-5 md:max-w-3xl" data-testid="video-detail">
        <BackBar label="Back to the feed" />
        <div className="keep-white relative aspect-video w-full overflow-hidden rounded-3xl border border-white/[0.06] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.thumbnailUrl} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md">
              <PlayCircle size={34} aria-hidden />
            </span>
          </div>
          <span className="absolute bottom-3 right-3 rounded bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">{video.duration}</span>
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            {video.category && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{video.category}</span>}
            <span className="rounded bg-cta px-2 py-0.5 text-[10px] font-bold text-[var(--on-accent)]">{video.source}</span>
          </div>
          <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-foreground" data-testid="video-title">
            {video.label}
          </h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-micro font-semibold text-muted-foreground/55">
            <Clock size={11} aria-hidden /> {video.duration}
          </p>
        </header>

        <p className="flex items-start gap-2 rounded-2xl border border-white/[0.06] px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground/60" data-testid="video-unavailable">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> This video isn&apos;t available to play yet.
        </p>

        <AdaptiveCard label="Try it yourself">
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground/70">While you wait, practise the same skills on real questions.</p>
          <Link
            href="/learn/practice"
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-[12px] font-bold uppercase tracking-wider text-primary-foreground outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
          >
            Start practising <ChevronRight size={14} aria-hidden />
          </Link>
        </AdaptiveCard>

        {more.length > 0 && (
          <section aria-labelledby="more-videos" data-testid="video-related">
            <h2 id="more-videos" className="mb-3 text-[13px] font-bold text-foreground">
              More videos
            </h2>
            <ul className="flex flex-col gap-2.5">
              {more.map((v) => (
                <li key={v.id}>
                  <Link href={videoHref(v.id)} className={cn(ROW_CLASS, "flex items-center gap-3 outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-12 w-20 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-foreground/90">{v.label}</span>
                      <span className="block text-micro text-muted-foreground/55">
                        {v.source} · {v.duration}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </PageContainer>
  );
}
