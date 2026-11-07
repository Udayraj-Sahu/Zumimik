import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
let params = new URLSearchParams();

vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/dashboard/feed/story",
}));

const story = (id: string, category: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  category,
  thumbnailUrl: `https://img.example/${id}.jpg`,
  eyebrow: `Eyebrow ${id}`,
  title,
  subtitle: `Subtitle for ${title}`,
  readTime: "4 min read",
  publishedAt: "2026-11-04T10:00:00Z",
  ...extra,
});
const STORIES = [story("a", "Quant", "Percentages in 10 seconds"), story("b", "Quant", "Ratio shortcuts"), story("c", "Verbal", "Speed reading for RC")];
const VIDEOS = [
  { id: "v1", category: "Quant", thumbnailUrl: "https://img.example/v1.jpg", label: "Crosswise in action", source: "Vedic Master", duration: "15 min" },
  { id: "v2", category: "LR", thumbnailUrl: "https://img.example/v2.jpg", label: "LR patterns", source: "Strategy Lab", duration: "8 min" },
];
const page = (over: Record<string, unknown> = {}) => ({ hero: null, categories: ["Explore"], stories: STORIES, videos: VIDEOS, total_stories: 3, has_more: false, ...over });

async function renderDetail(kind: "story" | "video", id: string) {
  vi.resetModules();
  params = new URLSearchParams({ id });
  const { default: Page } = await import(`@/app/(app)/dashboard/feed/${kind}/page`);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("feed story and video pages", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("a story opens with its title, summary, read time, date and category, and says the full article is not published", async () => {
    apiGet.mockResolvedValue(page());
    await renderDetail("story", "a");
    expect(await screen.findByTestId("story-title")).toHaveTextContent("Percentages in 10 seconds");
    const detail = screen.getByTestId("story-detail");
    expect(detail).toHaveTextContent("Subtitle for Percentages in 10 seconds");
    expect(detail).toHaveTextContent("4 min read");
    expect(detail).toHaveTextContent("Quant");
    expect(detail).toHaveTextContent("2026");
    expect(screen.getByTestId("story-body-note")).toHaveTextContent("full article isn't published yet");
    expect(screen.getByRole("link", { name: /Start practising/ })).toHaveAttribute("href", "/learn/practice");
  });

  it("lists other stories from the same category, each linking to its own page", async () => {
    apiGet.mockResolvedValue(page());
    await renderDetail("story", "a");
    const related = await screen.findByTestId("story-related");
    expect(within(related).getByRole("link", { name: /Ratio shortcuts/ })).toHaveAttribute("href", "/dashboard/feed/story?id=b");
    expect(within(related).queryByText(/Speed reading/)).not.toBeInTheDocument(); // a different category
    expect(within(related).queryByText("Percentages in 10 seconds")).not.toBeInTheDocument(); // not itself
  });

  it("keeps loading further pages until the story asked for turns up", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path.includes("offset=0") ? page({ stories: [STORIES[0]], has_more: true }) : page({ stories: [STORIES[2]], has_more: false }),
    );
    await renderDetail("story", "c");
    expect(await screen.findByTestId("story-title")).toHaveTextContent("Speed reading for RC");
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("offset=1")));
  });

  it("a story that is not in the feed says so and offers the way back", async () => {
    apiGet.mockResolvedValue(page());
    await renderDetail("story", "nope");
    expect(await screen.findByTestId("feed-detail-missing")).toHaveTextContent("isn't in the feed any more");
    expect(screen.getByRole("button", { name: "Back to feed" })).toBeInTheDocument();
  });

  it("a failed load says so and offers Retry", async () => {
    apiGet.mockRejectedValue(new Error("down"));
    await renderDetail("story", "a");
    expect(await screen.findByTestId("feed-detail-missing")).toHaveTextContent("Couldn't load this story");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("a video opens with its title, source and length, says it cannot be played yet, and lists the other videos", async () => {
    apiGet.mockResolvedValue(page());
    await renderDetail("video", "v1");
    expect(await screen.findByTestId("video-title")).toHaveTextContent("Crosswise in action");
    const detail = screen.getByTestId("video-detail");
    expect(detail).toHaveTextContent("Vedic Master");
    expect(detail).toHaveTextContent("15 min");
    expect(screen.getByTestId("video-unavailable")).toHaveTextContent("isn't available to play yet");
    expect(within(screen.getByTestId("video-related")).getByRole("link", { name: /LR patterns/ })).toHaveAttribute("href", "/dashboard/feed/video?id=v2");
  });
});
