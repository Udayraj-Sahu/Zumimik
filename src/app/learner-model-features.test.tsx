import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";

vi.setConfig({ testTimeout: 60000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
let params = new URLSearchParams();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: (...a: unknown[]) => apiPost(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/play/sprint/results",
}));

const NOW = Date.now();
const DAY = 86_400_000;

function practised(skill: string, results: boolean[], lastAt = NOW - DAY): TechniqueState {
  let s = freshState(skill);
  results.forEach((c, i) => { s = processAttempt(s, { correct: c, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}${i}`, at: lastAt - (results.length - i) * 1000 }); });
  return s;
}
const snapshotOf = (states: Record<string, TechniqueState>) => ({ technique_states: JSON.parse(JSON.stringify(states)), as_of: NOW - DAY });

async function boot(states: Record<string, TechniqueState>, catalogSkills: string[] = Object.keys(states)) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/practice/mastery") return snapshotOf(states);
    if (path === "/practice/catalog") return { skills: catalogSkills.map((skill) => ({ skill, parents: [], servable: 9 })) };
    throw new Error("unexpected GET " + path);
  });
  apiPost.mockImplementation(async (path: string) => (path === "/sync" ? { accepted: 1, rejected: [] } : { items: [], summary: { requested: 1, served: 0 } }));
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true, dob: { day: 1, month: "January", year: 2000 } });
  const { db } = await import("@/services/offline/db");
  await db.eventQueue.clear();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (ui: React.ReactElement) => <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
  return { wrap, client };
}

const q = (id: string, skillId: string, difficulty = 3) => ({ id, text: `${id}?`, options: [], correctIndex: -1, answerType: "text" as const, skillId, techniqueId: skillId, difficulty, feedsMastery: true, trustStatus: "trusted" as const, timeLimit: 30, sourceId: id });
const ans = (questionId: string, correct: boolean, timeSpent = 5) => ({ questionId, selectedIndex: -1, answerText: "x", correct, timeSpent, answeredAt: Date.now() - 1000 });

async function putSprintResult(questions: ReturnType<typeof q>[], answers: ReturnType<typeof ans>[]) {
  const { useSprintStore } = await import("@/stores/sprint-store");
  const correct = answers.filter((a) => a.correct).length;
  useSprintStore.setState({
    status: "completed",
    lastSession: { questions, topic: "Fractions", topicLabel: "Fractions", difficulty: "adaptive" },
    lastResult: { answers, score: correct, total: answers.length, accuracy: Math.round((correct / answers.length) * 100), totalTimeSpent: answers.reduce((s, a) => s + a.timeSpent, 0), xpEarned: 10 },
  } as never);
}

describe("features read one learner model", () => {
  beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
    apiPost.mockReset();
    params = new URLSearchParams();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  describe("Adaptive Learning tab", () => {
    it("shows progress by mastery label, strong and weak techniques, recent practice, the next step and revision", async () => {
      const states = {
        Strong: practised("Strong", Array(30).fill(true), NOW - 2 * DAY),
        Weak: practised("Weak", [false, false, false, false], NOW - 3 * DAY),
        Lapsed: practised("Lapsed", Array(30).fill(true), NOW - 12 * DAY),
      };
      const { wrap } = await boot(states, ["Strong", "Weak", "Lapsed", "Fresh"]);
      const { AdaptiveEngineSection } = await import("@/components/adaptive/adaptive-engine-section");
      render(wrap(<AdaptiveEngineSection />));

      const card = await screen.findByTestId("learner-progress");
      // Strong is Fluid; Lapsed was Fluid but has been idle past 7 days, so the engine now reads it as Fragile.
      await waitFor(() => expect(screen.getByTestId("progress-summary")).toHaveTextContent("1 of 3 techniques is Fluid"));
      expect(card).toHaveTextContent("Strong: Strong");
      expect(card).toHaveTextContent("Needs practice: Weak");
      expect(within(screen.getByTestId("recent-practice")).getAllByRole("listitem")).toHaveLength(3);
      expect(await screen.findByTestId("next-step")).toBeInTheDocument();
      const revision = await screen.findByTestId("review-reminders");
      expect(revision).toHaveTextContent("Lapsed");
      expect(revision).toHaveTextContent("Not practised for 12 days");
      expect(card.textContent ?? "").not.toMatch(/\d+\s*(XP|day streak|streak)/i); // no XP or streak figure: behaviour is elsewhere on the page and is not mastery
    });

    it("shows nothing for a learner with no history, and nothing when the history cannot be read", async () => {
      const { wrap } = await boot({});
      const { AdaptiveEngineSection } = await import("@/components/adaptive/adaptive-engine-section");
      render(wrap(<AdaptiveEngineSection />));
      await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/practice/mastery"));
      expect(screen.queryByTestId("learner-progress")).not.toBeInTheDocument();
      cleanup();
      apiGet.mockImplementation(async () => { throw new Error("offline"); });
      render(wrap(<AdaptiveEngineSection />));
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTestId("learner-progress")).not.toBeInTheDocument();
    });
  });

  describe("Sprint Results", () => {
    it("shows each technique's mastery change, computed by the same pipeline that persists it, plus the next step", async () => {
      const base = { Fractions: practised("Fractions", [false, false, false, false]) };
      const { wrap } = await boot(base);
      const questions = [q("n1", "Fractions"), q("n2", "Fractions"), q("n3", "Fractions")];
      const answers = [ans("n1", true), ans("n2", true), ans("n3", true)];
      await putSprintResult(questions, answers);

      // What the engine says should happen, computed independently through the shared functions.
      const { applySession, buildSessionLog, hydrateLearner } = await import("@/lib/learning/learner-state");
      const before = hydrateLearner(snapshotOf(base), Date.now());
      const expected = applySession(before, buildSessionLog(questions, answers, { endedAt: Date.now() }), Date.now())!.Fractions.state;

      const { default: Page } = await import("@/app/(app)/play/sprint/results/page");
      render(wrap(<Page />));
      const row = await screen.findByTestId("session-change-row");
      expect(row).toHaveTextContent("3/3 right this session"); // accuracy, stated apart from mastery
      const chips = within(row).getAllByTestId("mastery-state");
      expect(chips[chips.length - 1]).toHaveAttribute("data-state", expected); // the label shown is the engine's
      expect(chips[0]).toHaveAttribute("data-state", "fractured"); // where the learner started
      expect(await screen.findByTestId("next-step")).toBeInTheDocument();
      // the same change reached the server in the batch that was queued
      const events = apiPost.mock.calls.filter(([p]) => p === "/sync").flatMap(([, b]) => (b as { events: Array<{ event_type: string; metadata: any }> }).events);
      expect(events.find((e) => e.event_type === "session_end")?.metadata.technique_states.Fractions.state).toBe(expected);
    });

    it("shows no mastery change when the history could not be read (nothing is invented)", async () => {
      const { wrap } = await boot({});
      apiGet.mockImplementation(async () => { throw new Error("offline"); });
      await putSprintResult([q("n1", "Fractions")], [ans("n1", true)]);
      const { default: Page } = await import("@/app/(app)/play/sprint/results/page");
      render(wrap(<Page />));
      await screen.findByText(/Great Work|Good|Keep/i);
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTestId("session-change")).not.toBeInTheDocument();
    });
  });

  describe("Sprint Analysis", () => {
    it("shows accuracy by technique and difficulty, and keeps each technique's mastery label beside it", async () => {
      const { wrap } = await boot({ Fractions: practised("Fractions", Array(30).fill(true)), Decimals: practised("Decimals", [false, false, false, false]) });
      const questions = [q("a", "Fractions", 2), q("b", "Fractions", 4), q("c", "Decimals", 3)];
      await putSprintResult(questions, [ans("a", true, 3), ans("b", false, 9), ans("c", false, 6)]);
      const { default: Page } = await import("@/app/(app)/play/sprint/results/analysis/page");
      render(wrap(<Page />));
      const card = await screen.findByTestId("session-breakdown");
      const rows = within(card).getAllByTestId("breakdown-technique");
      expect(rows).toHaveLength(2);
      const decimals = rows.find((r) => r.textContent?.includes("Decimals"))!;
      expect(decimals).toHaveTextContent("0/1 · 0%");
      await waitFor(() => expect(within(decimals).getByTestId("mastery-state")).toHaveAttribute("data-state", "fractured"));
      const fractions = rows.find((r) => r.textContent?.includes("Fractions"))!;
      expect(fractions).toHaveTextContent("1/2 · 50%");
      await waitFor(() => expect(within(fractions).getByTestId("mastery-state")).toHaveAttribute("data-state", "fluid"));
      expect(screen.getByTestId("breakdown-difficulty")).toHaveTextContent("level 2 1/1 · level 3 0/1 · level 4 0/1");
      expect(card).toHaveTextContent("Average time per answer: 6s");
    });
  });

  describe("Timed Sprint difficulty", () => {
    async function openSprint(difficulty: string) {
      params = new URLSearchParams({ topic: "Fractions", length: "5", difficulty });
      const { wrap } = await boot({ Fractions: practised("Fractions", [true, true, true, true, true, true]) });
      // a learner whose own ability estimate is well above the explicit level
      const { restoreTheta } = await import("@/lib/learning/ability");
      void restoreTheta;
      localStorage.setItem("zuzumik:ability:u1", JSON.stringify({
        subject: "quant", theta: 2, se: 0.5, n: 6,
        responses: Array.from({ length: 6 }, (_, i) => ({ problemId: `p${i}`, a: 1, b: 2, correct: true })),
      }));
      const { default: Page } = await import("@/app/(app)/play/sprint/page");
      render(wrap(<Page />));
      await waitFor(() => expect(apiPost.mock.calls.some(([p]) => p === "/practice/session")).toBe(true));
      return (apiPost.mock.calls.find(([p]) => p === "/practice/session") as unknown as [string, { theta?: number }])[1];
    }

    it("an explicit Beginner choice is respected, not replaced by the learner's ability", async () => {
      const body = await openSprint("beginner");
      const { levelToTheta } = await import("@/services/practice");
      expect(body.theta).toBe(levelToTheta(2));
    });

    it("an explicit Advanced choice is respected too", async () => {
      const body = await openSprint("advanced");
      const { levelToTheta } = await import("@/services/practice");
      expect(body.theta).toBe(levelToTheta(4));
    });

    it("only 'Adaptive' follows the learner's own ability estimate", async () => {
      const body = await openSprint("adaptive");
      const { thetaForRequest } = await import("@/lib/learning/ability");
      const { restoreTheta } = await import("@/lib/learning/ability");
      expect(body.theta).toBe(thetaForRequest(restoreTheta(JSON.parse(localStorage.getItem("zuzumik:ability:u1")!))));
      expect(body.theta).toBeGreaterThan(1);
    });
  });
});
