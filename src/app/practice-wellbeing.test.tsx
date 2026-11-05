import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt } from "@vmsg/psychometrics";

vi.setConfig({ testTimeout: 60000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: (...a: unknown[]) => apiPost(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/learn/practice",
}));

const SKILL = "Fractions and Decimals";
const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 6, 12, 0, 0);

const item = (n: number, bucket = "primary") => ({
  source: "tier1_static", template_id: `t${n}`, question_text: `${n} + ${n} = ?`, difficulty: 2, skill: SKILL, technique: null, topic: null, sub_topic: null,
  trust: "trusted", feeds_mastery: true, answer_check: "client_extract", expected_answer: n * 2, bucket,
  template: { key_reminders: [`double ${n}`] },
});

function fluidSnapshot() {
  let s = freshState(SKILL);
  for (let i = 0; i < 30; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 20, problemId: `old${i}`, at: T0 - 2 * 86_400_000 + i * 1000 });
  return { technique_states: { [SKILL]: JSON.parse(JSON.stringify(s)) }, as_of: T0 - 86_400_000 };
}

async function boot(items: Array<ReturnType<typeof item>>) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/practice/mastery") return fluidSnapshot();
    if (path === "/practice/catalog") return { skills: [{ skill: SKILL, servable: 20, feeds_mastery: 20, by_difficulty: {}, generated: 0, parents: [] }] };
    if (path === "/chat/policy") return { hints_only: true, rag: false, llm_enabled: false, model: null, daily_token_budget: 0, budget_remaining: 0, usage_today: {} };
    if (path === "/social/policy") return { kids_mode: false, session_cap_enforced: false };
    throw new Error("unexpected GET " + path);
  });
  apiPost.mockImplementation(async (path: string) => (path === "/sync" ? { accepted: 1 } : { items, summary: { requested: items.length, served: items.length } }));
  const { default: Page } = await import("@/app/(app)/learn/practice/page");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true, dob: { day: 1, month: "January", year: 2000 }, activePath: null });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

/** Answer the question on screen, `after` ms after it appeared, with the given verdict. */
async function answerCurrent(n: number, after: number, right: boolean) {
  await screen.findByText(`${n} + ${n} = ?`);
  act(() => { vi.setSystemTime(Date.now() + after); });
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: right ? String(n * 2) : "999" } });
  fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
}
const next = (label: RegExp = /^Next/) => fireEvent.click(screen.getByRole("button", { name: label }));

describe("practice: the learning engine looks after a tiring learner", () => {
  beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
    apiPost.mockReset();
    vi.useFakeTimers({ toFake: ["Date"], now: T0 });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  async function start() {
    fireEvent.click(await screen.findByRole("button", { name: `Select ${SKILL}` }));
    fireEvent.click(screen.getByRole("button", { name: /Start Practice/ }));
  }

  it("pauses with a short break, opens the hints, and logs the checkpoint and the intervention", async () => {
    await boot(Array.from({ length: 12 }, (_, i) => item(i + 1)));
    await start();

    // Five quick, correct answers: the engine's baseline for this session.
    for (let n = 1; n <= 5; n++) {
      await answerCurrent(n, 4_000, true);
      if (n === 5) act(() => { vi.setSystemTime(Date.now() + 22 * MIN); }); // past the engine's 20-minute gate
      next();
    }
    // Five slow answers (one wrong) after a long stretch: the learner is tiring.
    for (let n = 6; n <= 10; n++) {
      await answerCurrent(n, 40_000, n !== 8);
      if (n < 10) next();
    }

    const overlay = await screen.findByTestId("break-overlay");
    expect(overlay).toHaveTextContent("Quick breather");
    expect(screen.getByTestId("break-timer")).toHaveTextContent("2:00"); // the engine's 120-second break
    expect(overlay.textContent ?? "").not.toMatch(/fatigue|dfv|clr|index|threshold/i); // no internal terms

    // The break can be skipped, and the learner continues; hints now start open ("guided").
    fireEvent.click(screen.getByRole("button", { name: "Back to it" }));
    await waitFor(() => expect(screen.queryByTestId("break-overlay")).not.toBeInTheDocument());
    next();
    expect(await screen.findByText("double 11")).toBeInTheDocument();

    // Finish the session: the batch carries both psychometric events.
    await answerCurrent(11, 5_000, true);
    next();
    await answerCurrent(12, 5_000, true);
    next(/See Results/);
    await waitFor(() => expect(apiPost.mock.calls.some(([p]) => p === "/sync")).toBe(true));
    const events = apiPost.mock.calls.filter(([p]) => p === "/sync").flatMap(([, body]) => (body as { events: Array<{ event_type: string; metadata: Record<string, any> }> }).events);
    const clr = events.find((e) => e.event_type === "clr_mode_activated");
    expect(clr?.metadata).toMatchObject({ intervention: "standard", ui_mode_to: "guided", micro_break_s: 120, new_problem_cap: 3 });
    const fatigue = events.filter((e) => e.event_type === "fatigue_index_computed");
    expect(fatigue.length).toBeGreaterThanOrEqual(2); // a checkpoint every five scored answers
    expect(fatigue.some((e) => e.metadata.exceeded === true)).toBe(true);
    expect(events[events.length - 1].event_type).toBe("session_end"); // psychometric events sit before it
  });

  it("a session that goes well is never interrupted", async () => {
    await boot(Array.from({ length: 10 }, (_, i) => item(i + 1)));
    await start();
    for (let n = 1; n <= 10; n++) {
      await answerCurrent(n, 4_000, true);
      if (n === 5) act(() => { vi.setSystemTime(Date.now() + 22 * MIN); });
      if (n < 10) next();
    }
    await waitFor(() => expect(screen.getByText("Correct.")).toBeInTheDocument());
    expect(screen.queryByTestId("break-overlay")).not.toBeInTheDocument();
  });

  it("a short session never reaches the engine's gates, so nothing is evaluated and nothing interrupts", async () => {
    await boot(Array.from({ length: 6 }, (_, i) => item(i + 1)));
    await start();
    for (let n = 1; n <= 6; n++) {
      await answerCurrent(n, 60_000, n % 2 === 0);
      if (n < 6) next();
    }
    expect(screen.queryByTestId("break-overlay")).not.toBeInTheDocument();
  });
});
