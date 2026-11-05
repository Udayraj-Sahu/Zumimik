import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
const push = vi.fn();

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/play/ghosts",
}));

const wrap = (ui: React.ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
);

describe("ghost runs with the live backend", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("builds aligned arrays: unanswered questions are wrong with a positive time", async () => {
    const { buildGhostRun } = await import("@/services/ghosts");
    const run = buildGhostRun(
      [{ id: "a" }, { id: "b" }],
      { answers: [{ questionId: "a", selectedIndex: 0, correct: true, timeSpent: 4.2 }] },
    );
    expect(run).toEqual({ problemIds: ["a", "b"], answerTimesMs: [4200, 1], correct: [true, false] });
  });

  it("lists ghosts and a race opens a sprint of the same skill and length with the ghost id", async () => {
    apiGet.mockResolvedValue({ ghosts: [
      { ghost_id: "g1", owner: "Ada", skill: "Fractions", problems: 5, total_time_ms: 42000, problems_correct: 4, is_public: false, created_at: "x" },
      { ghost_id: "g2", owner: "Anonymous", skill: null, problems: 5, total_time_ms: 1000, problems_correct: 1, is_public: true, created_at: "x" },
    ] });
    const { default: Page } = await import("@/app/(app)/play/ghosts/page");
    render(wrap(<Page />));
    expect(await screen.findAllByTestId("ghost-row")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Race Anonymous" })).toBeDisabled(); // no skill recorded: it cannot be re-run
    fireEvent.click(screen.getByRole("button", { name: "Race Ada" }));
    expect(push).toHaveBeenCalledWith("/play/sprint?topic=Fractions&length=5&difficulty=adaptive&ghost=g1");
  });

  it("the results panel posts the race once and saves a ghost", async () => {
    apiPost.mockImplementation(async (path: string) =>
      path.endsWith("/race")
        ? { race_id: "r", won: true, xp_awarded: 20, ghost: { total_time_ms: 50000, problems_correct: 3 } }
        : { ghost_id: "new", is_public: false },
    );
    const { GhostPanel } = await import("@/components/ghosts/ghost-panel");
    const questions = [{ id: "q1" }, { id: "q2" }] as never;
    const result = { answers: [{ questionId: "q1", selectedIndex: 0, correct: true, timeSpent: 3 }], score: 1, total: 2, accuracy: 50, totalTimeSpent: 9, xpEarned: 0 };
    render(wrap(<GhostPanel ghostId="g1" skill="Fractions" questions={questions} result={result} />));
    expect(await screen.findByText("You beat the ghost!")).toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledWith("/social/ghosts/g1/race", { time_ms: 9000, correct: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Save ghost" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/ghosts", expect.objectContaining({
      skill: "Fractions", problem_ids: ["q1", "q2"], answer_times_ms: [3000, 1], correct: [true, false], is_public: false,
    })));
    expect(apiPost.mock.calls.filter(([p]) => String(p).endsWith("/race"))).toHaveLength(1);
  });
});

describe("social policy", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("reads the session cap from GET /social/policy", async () => {
    apiGet.mockReset();
    vi.resetModules();
    apiGet.mockResolvedValue({ kids_mode: true, taunts_enabled: false, session_cap_enforced: true, session_cap_minutes: 10, session_cap_remaining_minutes: 4 });
    const { getSocialPolicy } = await import("@/services/social-policy");
    expect(await getSocialPolicy()).toEqual({ kidsMode: true, tauntsEnabled: false, sessionCapEnforced: true, sessionCapMinutes: 10, sessionRemainingMinutes: 4 });
    expect(apiGet).toHaveBeenCalledWith("/social/policy");
  });
});
