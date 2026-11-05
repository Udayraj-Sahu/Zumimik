import { apiGet } from "./api";

/**
 * GET /api/v1/feed?category=&limit=&offset= (public, no login needed):
 *   { hero: { imageUrl, badge, title, actionUrl }, categories: string[], stories: [...], videos: [...], total_stories, has_more }
 * `category` filters stories and videos ("Explore" = everything); `limit` is 1-50; `offset` pages the stories (the hero, categories
 * and videos come with every page). The backend has no article or video detail route and no URL on a video, so stories and videos
 * are shown but cannot be opened.
 */
export type FeedHeroData = { imageUrl: string; badge: string; title: string; actionUrl?: string };
export type FeedStoryData = {
  id: string;
  category?: string;
  thumbnailUrl: string;
  eyebrow: string;
  title?: string;
  subtitle: string;
  readTime: string;
  publishedAt?: string;
};
export type FeedVideoData = { id: string; category?: string; thumbnailUrl: string; label: string; source: string; duration: string };

export type FeedPage = {
  hero: FeedHeroData | null;
  categories: string[];
  stories: FeedStoryData[];
  videos: FeedVideoData[];
  total_stories: number;
  has_more: boolean;
};

export const FEED_PAGE_SIZE = 20;

export async function getFeed(category: string, offset = 0, limit = FEED_PAGE_SIZE): Promise<FeedPage> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (category && category !== "Explore") qs.set("category", category);
  const res = await apiGet<Partial<FeedPage>>(`/feed?${qs.toString()}`);
  return {
    hero: res?.hero && typeof res.hero.title === "string" ? res.hero : null,
    categories: Array.isArray(res?.categories) ? res.categories.filter((c): c is string => typeof c === "string") : [],
    stories: Array.isArray(res?.stories) ? res.stories : [],
    videos: Array.isArray(res?.videos) ? res.videos : [],
    total_stories: typeof res?.total_stories === "number" ? res.total_stories : (res?.stories?.length ?? 0),
    has_more: res?.has_more === true,
  };
}
