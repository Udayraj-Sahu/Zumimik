import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/play/daily",
}));

const PROBLEMS = [
  { problem_id: "p1", text: "12 x 12 = ?", difficulty: 2 },
  { problem_id: "p2", text: "7 + 8 = ?", difficulty: 1 },
];

async function renderDaily() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { default: Page } = await import("@/app/(app)/play/daily/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("/play/daily with the live backend", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("plays the problems, submits the answers to /social/daily/submit and shows the result with the leaderboard", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === "/social/daily"
        ? { date: "2026-11-05", problems: PROBLEMS, submitted: null }
        : { date: "2026-11-05", mode: "full", participants: 3, entries: [{ rank: 1, name: "Ada", score: 120, problems_correct: 2 }], me: { rank: 1, score: 120, percentile: 100 } },
    );
    apiPost.mockResolvedValue({ problems_correct: 2, problems_total: 2, score: 120, rank: 1, xp_awarded: 30 });
    await renderDaily();

    expect(await screen.findByTestId("daily-question")).toHaveTextContent("12 x 12 = ?");
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "144" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("7 + 8 = ?")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByTestId("daily-result")).toHaveTextContent("2/2 correct");
    expect(apiPost).toHaveBeenCalledWith("/social/daily/submit", { answers: ["144", "15"], total_time_ms: expect.any(Number) });
    expect(await screen.findByTestId("daily-leaderboard")).toHaveTextContent("Ada");
  });

  it("an already-played day shows the stored score and does not offer the problems again", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === "/social/daily"
        ? { date: "2026-11-05", problems: PROBLEMS, submitted: { problems_correct: 1, problems_total: 2, total_time_ms: 65000, score: 100 } }
        : { date: "2026-11-05", mode: "hidden", entries: [], me: null },
    );
    await renderDaily();
    expect(await screen.findByTestId("daily-result")).toHaveTextContent("1/2 correct");
    expect(screen.queryByTestId("daily-question")).not.toBeInTheDocument();
    await waitFor(() => expect(apiPost).not.toHaveBeenCalled());
  });
});
