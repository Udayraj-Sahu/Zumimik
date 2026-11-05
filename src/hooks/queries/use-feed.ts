import { useInfiniteQuery } from "@tanstack/react-query";
import { FEED_PAGE_SIZE, getFeed, type FeedPage } from "@/services/feed";

/** The feed for one category, loaded a page of stories at a time (GET /feed?category=&limit=&offset=). */
export function useFeed(category: string) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ["feed", category],
    queryFn: ({ pageParam }) => getFeed(category, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.reduce((n, p) => n + p.stories.length, 0) : undefined),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export { FEED_PAGE_SIZE };
