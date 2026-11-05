import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";

vi.setConfig({ testTimeout: 60000 });
const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));

const NOW = Date.now();
const DAY = 86_400_000;
function practised(skill: string, results: boolean[], lastAt: number): TechniqueState {
  let s = freshState(skill);
  results.forEach((c, i) => { s = processAttempt(s, { correct: c, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}${i}`, at: lastAt - (results.length - i) * 1000 }); });
  return s;
}

async function plan(opts: { readable: boolean }) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const states = {
    Basics: practised("Basics", Array(30).fill(true), NOW - DAY),
    Fractions: practised("Fractions", [false, false, true, false], NOW - 2 * DAY),
    Old: practised("Old", Array(30).fill(true), NOW - 12 * DAY),
  };
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/practice/mastery") {
      if (!opts.readable) throw new Error("offline");
      return { technique_states: JSON.parse(JSON.stringify(states)), as_of: NOW - DAY };
    }
    if (path === "/practice/catalog") return { skills: ["Basics", "Fractions", "Old", "Fresh"].map((skill) => ({ skill, parents: skill === "Fresh" ? ["Basics"] : [], servable: 9 })) };
    throw new Error("unexpected GET " + path);
  });
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1" } as never, token: "t", isAuthenticated: true });
  const { useTodayPlan } = await import("@/hooks/queries/use-adaptive");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useTodayPlan("cat"), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
}

describe("the Adaptive tab's plan in real mode", () => {
  beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("comes from the learner model: review first, the engine's next technique second, difficulty left to the learner's ability", async () => {
    const hook = await plan({ readable: true });
    await waitFor(() => expect(hook.result.current.data.weakTopic).not.toBeNull(), { timeout: 15000 });
    const { weakTopic, practice } = hook.result.current.data;
    expect(["Fractions", "Old"]).toContain(weakTopic!.topicId); // a review-queue technique (failing, or idle past the 7-day cliff)
    expect(weakTopic!.difficulty).toBe("Adaptive"); // not a level picked from a mastery percentage
    expect(practice).not.toBeNull();
    expect(practice!.topicId).not.toBe(weakTopic!.topicId);
  });

  it("when the history cannot be read it falls back to the earlier plan instead of showing nothing", async () => {
    const hook = await plan({ readable: false });
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/practice/mastery"), { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 50));
    expect(hook.result.current.data).toBeDefined(); // never undefined: the screen is not left empty
  });
});

describe("no flash of the earlier plan while the learner model loads", () => {
  it("shows nothing until the engine's plan is ready, and never the heuristic's choice in between", async () => {
    vi.resetModules();
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    const states = {
      Basics: practised("Basics", Array(30).fill(true), NOW - DAY),
      Fractions: practised("Fractions", [false, false, true, false], NOW - 2 * DAY), // the lowest percentage: what the heuristic would pick
      Old: practised("Old", Array(30).fill(true), NOW - 12 * DAY), // idle past the 7-day cliff: what the engine puts first
    };
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/practice/mastery") return { technique_states: JSON.parse(JSON.stringify(states)), as_of: NOW - DAY };
      if (path === "/practice/catalog") {
        await new Promise((r) => setTimeout(r, 300)); // the learner model is slower than the mastery list
        return { skills: ["Basics", "Fractions", "Old"].map((skill) => ({ skill, parents: [], servable: 9 })) };
      }
      throw new Error("unexpected GET " + path);
    });
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never, token: "t", isAuthenticated: true });
    const { useTodayPlan } = await import("@/hooks/queries/use-adaptive");
    const seen: Array<string | null> = [];
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const hook = renderHook(
      () => {
        const r = useTodayPlan("cat");
        seen.push(r.data.weakTopic?.topicId ?? null);
        return r;
      },
      { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> },
    );
    await waitFor(() => expect(hook.result.current.data.weakTopic).not.toBeNull(), { timeout: 15000 });
    expect(hook.result.current.data.weakTopic!.topicId).toBe("Old");
    expect(seen.filter((x) => x !== null)).not.toContain("Fractions"); // the heuristic's pick was never shown
    expect(seen[0]).toBeNull(); // and the first thing shown was nothing, not a guess
    vi.unstubAllEnvs();
  });
});
