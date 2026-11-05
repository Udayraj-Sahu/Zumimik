import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const push = vi.fn();

vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/feed",
}));

const story = (id: string, category: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  category,
  thumbnailUrl: `https://img.example/${id}.jpg`,
  eyebrow: `Eyebrow ${id}`,
  title,
  subtitle: `Subtitle for ${title}`,
  readTime: "3 min read",
  publishedAt: "2026-11-04T10:00:00Z",
  ...extra,
});
const HERO = { imageUrl: "https://img.example/hero.jpg", badge: "Daily Challenge", title: "Beat yesterday's speed", actionUrl: "/learn/practice" };
const CATEGORIES = ["Explore", "Quant", "Verbal"];
const ALL = [story("a", "Quant", "Percentages in 10 seconds"), story("b", "Verbal", "Speed reading for RC")];
const VIDEOS = [{ id: "v1", category: "Quant", thumbnailUrl: "https://img.example/v1.jpg", label: "Crosswise in action", source: "Vedic Master", duration: "15 min" }];

function feed(over: Record<string, unknown> = {}) {
  return { hero: HERO, categories: CATEGORIES, stories: ALL, videos: VIDEOS, total_stories: ALL.length, has_more: false, ...over };
}

async function renderFeed() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { default: Page } = await import("@/app/(app)/dashboard/feed/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("/dashboard/feed against GET /feed (real mode)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    push.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows the hero, the stories and the videos the server sent", async () => {
    apiGet.mockResolvedValue(feed());
    await renderFeed();
    expect(await screen.findByText("Percentages in 10 seconds")).toBeInTheDocument();
    expect(screen.getByText("Speed reading for RC")).toBeInTheDocument();
    expect(screen.getByTestId("feed-hero")).toHaveTextContent("Beat yesterday's speed");
    expect(screen.getByTestId("feed-hero")).toHaveTextContent("Daily Challenge");
    expect(screen.getByTestId("feed-videos")).toHaveTextContent("Crosswise in action");
    expect(screen.getByTestId("feed-videos")).toHaveTextContent("15 min");
    expect(apiGet).toHaveBeenCalledWith("/feed?limit=20&offset=0");
  });

  it("the category chips come from the server and a chip asks for that category", async () => {
    apiGet.mockImplementation(async (path: string) => (path.includes("category=Quant") ? feed({ stories: [ALL[0]], total_stories: 1 }) : feed()));
    await renderFeed();
    await screen.findByText("Speed reading for RC");
    fireEvent.click(screen.getByRole("button", { name: "Quant" }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/feed?limit=20&offset=0&category=Quant"));
    await waitFor(() => expect(screen.queryByText("Speed reading for RC")).not.toBeInTheDocument());
    expect(screen.getByText("Percentages in 10 seconds")).toBeInTheDocument();
  });

  it("search filters what is loaded, and says so when nothing matches", async () => {
    apiGet.mockResolvedValue(feed());
    await renderFeed();
    await screen.findByText("Speed reading for RC");
    fireEvent.change(screen.getByLabelText("Search the feed"), { target: { value: "percent" } });
    expect(screen.queryByText("Speed reading for RC")).not.toBeInTheDocument();
    expect(screen.getByText("Percentages in 10 seconds")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search the feed"), { target: { value: "zzzz" } });
    expect(screen.getByTestId("feed-empty")).toHaveTextContent("Nothing matches your search.");
  });

  it("Load more asks for the next page of stories with the right offset", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path.includes("offset=2") ? feed({ stories: [story("c", "Quant", "Third story")], has_more: false }) : feed({ has_more: true, total_stories: 3 }),
    );
    await renderFeed();
    await screen.findByText("Speed reading for RC");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/feed?limit=20&offset=2"));
    expect(await screen.findByText("Third story")).toBeInTheDocument();
    expect(screen.getByText("Percentages in 10 seconds")).toBeInTheDocument(); // earlier stories stay
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("the hero opens its action URL only when it is a page this app has", async () => {
    apiGet.mockResolvedValue(feed());
    await renderFeed();
    fireEvent.click(await screen.findByTestId("feed-hero"));
    expect(push).toHaveBeenCalledWith("/learn/practice");
  });

  it("a hero pointing somewhere the app does not have is shown but does nothing", async () => {
    apiGet.mockResolvedValue(feed({ hero: { ...HERO, actionUrl: "https://elsewhere.example/x" } }));
    await renderFeed();
    const hero = await screen.findByTestId("feed-hero");
    expect(hero).toBeDisabled();
    fireEvent.click(hero);
    expect(push).not.toHaveBeenCalled();
  });

  it("an empty category says so; no videos means no video section", async () => {
    apiGet.mockResolvedValue(feed({ stories: [], videos: [], total_stories: 0 }));
    await renderFeed();
    expect(await screen.findByTestId("feed-empty")).toHaveTextContent("No posts in this category yet.");
    expect(screen.queryByTestId("feed-videos")).not.toBeInTheDocument();
  });

  it("a failed load shows an error with Retry", async () => {
    apiGet.mockRejectedValueOnce(new Error("down"));
    await renderFeed();
    expect(await screen.findByTestId("feed-error")).toBeInTheDocument();
    apiGet.mockResolvedValue(feed());
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Percentages in 10 seconds")).toBeInTheDocument();
  });

  it("tolerates a sparse response (no hero, no categories)", async () => {
    apiGet.mockResolvedValue({ stories: ALL });
    await renderFeed();
    expect(await screen.findByText("Percentages in 10 seconds")).toBeInTheDocument();
    expect(screen.queryByTestId("feed-hero")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore" })).toBeInTheDocument();
  });
});

describe("/dashboard/feed has no bundled posts in any mode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("even with the mock flag on, it shows only what the API returns", async () => {
    apiGet.mockReset();
    apiGet.mockResolvedValue(feed({ stories: [story("only", "Quant", "Only from the server")], total_stories: 1 }));
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "true");
    const { default: Page } = await import("@/app/(app)/dashboard/feed/page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Page />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Only from the server")).toBeInTheDocument();
    expect(screen.queryByText("Speed reading techniques for verbal sections")).not.toBeInTheDocument(); // the old fixture text
  });

});
