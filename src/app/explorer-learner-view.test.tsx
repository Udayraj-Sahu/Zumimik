import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt } from "@vmsg/psychometrics";

vi.setConfig({ testTimeout: 30000 });
const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/learn/explorer",
}));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

function snapshot() {
  let s = freshState("Arithmetic");
  for (let i = 0; i < 30; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 10, problemId: `p${i}`, at: Date.now() - 86_400_000 + i });
  return { technique_states: { Arithmetic: JSON.parse(JSON.stringify(s)) }, as_of: Date.now() - 86_400_000 };
}

async function open(masteryReadable: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  apiGet.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/topics")) return { topics: [] };
    if (path.startsWith("/api/practice/techniques")) return { techniques: [
      { name: "Arithmetic", topic: "Arithmetic", sub_topic: null, is_root: true, problem_count: 100 },
      { name: "Fractions", topic: "Arithmetic", sub_topic: null, is_root: null, problem_count: 50 },
    ] };
    if (path === "/practice/catalog") return { skills: [{ skill: "Arithmetic", parents: [], servable: 9 }, { skill: "Fractions", parents: ["Arithmetic"], servable: 9 }] };
    if (path.startsWith("/dashboard/topics")) return [{ name: "Arithmetic", value: 88, color: "primary" }];
    if (path === "/api/subtopics/reference") return { count: 0, pages: [] };
    if (path === "/practice/mastery") {
      if (!masteryReadable) throw new Error("offline");
      return snapshot();
    }
    throw new Error("unexpected GET " + path);
  });
  const { default: Page } = await import("@/app/(app)/learn/explorer/page");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", activePreps: ["cat"], activePath: null, isOnboarded: true });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Page /></QueryClientProvider>);
}

describe("Explorer with the learner's real history", () => {
  it("labels each technique with the learner state; the recommendation itself lives in the Adaptive Learning tab", async () => {
    localStorage.clear();
    await open(true);
    await waitFor(() => expect(screen.getAllByTestId("mastery-state").some((c) => c.textContent === "Fluid")).toBe(true));
    expect(screen.queryByTestId("next-step")).not.toBeInTheDocument(); // recommendations are in the Adaptive Learning tab, not here
  });

  it("when the history cannot be read there are no labels, and the Explorer still works", async () => {
    localStorage.clear();
    await open(false);
    await screen.findByText("Arithmetic");
    expect(screen.queryByTestId("mastery-state")).not.toBeInTheDocument();
  });
});
