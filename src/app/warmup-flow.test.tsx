import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/learn/warmup",
}));

const ITEMS = [1, 2, 3, 4, 5, 6].map((n) => ({
  source: "tier1_static", template_id: `t${n}`, question_text: `${n} + ${n} = ?`, difficulty: 2, skill: `Skill${n}`,
  technique: null, topic: null, sub_topic: null, trust: "trusted", feeds_mastery: true, answer_check: "client_extract", expected_answer: n * 2,
  irt: { a: 1, b: -1, source: "seed" }, template: { key_reminders: [`double ${n}`] },
}));

type Server = { states: Record<string, unknown>; posts: Array<{ path: string; body: any }>; online: boolean; masteryFails?: boolean };

async function boot(server: Server) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const apiGet = vi.fn(async (path: string) => {
    if (path === "/practice/mastery") {
      if (server.masteryFails) throw new Error("mastery unavailable");
      return { technique_states: server.states, as_of: null };
    }
    if (path === "/practice/catalog") return { skills: ITEMS.map((i) => ({ skill: i.skill, parents: [], servable: 5 })) };
    throw new Error("unexpected GET " + path);
  });
  const apiPost = vi.fn(async (path: string, body: unknown) => {
    server.posts.push({ path, body });
    if (!server.online) throw new Error("offline");
    if (path === "/practice/session") return { items: ITEMS, summary: { requested: 6, served: 6 } };
    if (path === "/sync") return { accepted: 1 };
    throw new Error("unexpected POST " + path);
  });
  vi.doMock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet, apiPost }));
  vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage, apiUrl: (p: string) => p }));
  vi.doMock("@/providers/query-provider", () => ({ queryClient: { invalidateQueries: vi.fn() } }));
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", dob: { day: 1, month: "January", year: 2000 } });
  const { db } = await import("@/services/offline/db");
  await db.eventQueue.clear();
  const { default: Page } = await import("@/app/(app)/learn/warmup/page");
  const calibration = await import("@/services/calibration");
  const ui = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Page />
      </QueryClientProvider>,
    );
  return { ui, calibration, apiPost, useOnboardingStore };
}

async function answer(value: string, button: string) {
  fireEvent.change(await screen.findByLabelText("Your answer"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: button }));
}

describe("the cold-start warm-up", () => {
  let server: Server;
  beforeEach(() => {
    localStorage.clear();
    replace.mockReset();
    server = { states: {}, posts: [], online: true };
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("plays six problems, records hints and slow/wrong answers, sends calibration_completed and picks the path", async () => {
    const h = await boot(server);
    h.ui();
    expect(await screen.findByTestId("warmup-question")).toHaveTextContent("1 + 1 = ?");
    // the warm-up is requested from the engine's plan: one slot per root skill, no theta before anything is scored
    const sessionCall = server.posts.find((p) => p.path === "/practice/session")!;
    expect(sessionCall.body.slots).toHaveLength(6);

    // 1: correct with the hint  -> hint_or_slow (0.5)
    fireEvent.click(await screen.findByRole("button", { name: /Show a hint/ }));
    expect(screen.getByTestId("warmup-hint")).toHaveTextContent("double 1");
    await answer("2", "Next");
    // 2: wrong -> wrong (0.2)
    await answer("999", "Next");
    // 3-6: correct, quick -> correct_first_try (0.8)
    await answer("6", "Next");
    await answer("8", "Next");
    await answer("10", "Next");
    await answer("12", "Finish");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn?mode=adaptive"));
    const sync = server.posts.filter((p) => p.path === "/sync").flatMap((p) => p.body.events as Array<any>);
    const cal = sync.find((e) => e.event_type === "calibration_completed");
    expect(cal.metadata.priors).toMatchObject({ Skill1: 0.5, Skill2: 0.2, Skill3: 0.8, Skill4: 0.8, Skill5: 0.8, Skill6: 0.8 });
    expect(cal.metadata.active_path).toBe("exam_prep");
    expect(cal.metadata.ans_baseline_ms).toBeGreaterThan(0);
    expect(sync.filter((e) => e.event_type === "problem_attempt")).toHaveLength(6);
    const end = sync[sync.length - 1];
    expect(end.event_type).toBe("session_end");
    // the new skills start from their warm-up priors (a strong warm-up above a wrong one)
    expect(end.metadata.technique_states.Skill3.pLearned).toBeGreaterThan(end.metadata.technique_states.Skill2.pLearned);

    expect(h.calibration.loadCalibration("u1")).toMatchObject({ status: "completed", answered: 6, activePath: "exam_prep" });
    expect(h.calibration.loadWarmupDraft("u1")).toBeNull();
    expect(h.useOnboardingStore.getState().activePath).toBe("exam_prep");
  });

  it("recovers after a restart: the same questions, the answers already given", async () => {
    const first = await boot(server);
    first.ui();
    await answer("2", "Next");
    await answer("4", "Next");
    expect(first.calibration.loadWarmupDraft("u1")?.attempts).toHaveLength(2);
    cleanup();

    server.posts.length = 0;
    const second = await boot(server); // a fresh module graph: the page was reloaded or the app relaunched
    second.ui();
    expect(await screen.findByTestId("warmup-question")).toHaveTextContent("3 + 3 = ?");
    expect(server.posts.some((p) => p.path === "/practice/session")).toBe(false); // not re-requested, so not re-drawn
    expect(await second.calibration.getWarmupOffer("u1")).toBe("resume");
  });

  it("skipping with nothing answered stores 'skipped', sends nothing and never offers it again", async () => {
    const h = await boot(server);
    h.ui();
    fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn?mode=adaptive"));
    expect(h.calibration.loadCalibration("u1")?.status).toBe("skipped");
    expect(server.posts.some((p) => p.path === "/sync")).toBe(false);
    expect(await h.calibration.getWarmupOffer("u1")).toBe("none");
  });

  it("skipping the rest keeps what was answered (partial) and still calibrates those techniques", async () => {
    const h = await boot(server);
    h.ui();
    await answer("2", "Next");
    await answer("4", "Next");
    fireEvent.click(await screen.findByRole("button", { name: "Skip the rest" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn?mode=adaptive"));
    const cal = server.posts.filter((p) => p.path === "/sync").flatMap((p) => p.body.events as Array<any>).find((e) => e.event_type === "calibration_completed");
    expect(Object.keys(cal.metadata.priors)).toEqual(["Skill1", "Skill2"]);
    expect(h.calibration.loadCalibration("u1")).toMatchObject({ status: "partial", answered: 2 });
    expect(await h.calibration.getWarmupOffer("u1")).toBe("none");
  });

  it("finishing while offline stores the batch durably and does not block the learner", async () => {
    const h = await boot(server);
    h.ui();
    for (const [v, b] of [["2", "Next"], ["4", "Next"], ["6", "Next"], ["8", "Next"], ["10", "Next"]] as const) await answer(v, b);
    server.online = false;
    await answer("12", "Finish");
    // offline: the batch is stored durably and delivered later, so the learner is not blocked
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn?mode=adaptive"));
    const { db } = await import("@/services/offline/db");
    expect(await db.eventQueue.count()).toBe(1);
    expect(h.calibration.loadCalibration("u1")?.status).toBe("completed");
  });

  it("is only offered to a new learner: not to an established one, not twice, not when history is unknown", async () => {
    const established = { Fractions: { pLearned: 0.9, totalAttempts: 12, state: "fluid", engineVersion: 2 } };
    const known = await boot({ ...server, states: established });
    expect(await known.calibration.getWarmupOffer("u1")).toBe("none");

    const fresh = await boot({ states: {}, posts: [], online: true });
    expect(await fresh.calibration.getWarmupOffer("u1")).toBe("start");
    fresh.calibration.saveCalibration("u1", { status: "completed", updatedAt: Date.now(), priors: {}, ansBaselineMs: 0, activePath: null, answered: 6 });
    expect(await fresh.calibration.getWarmupOffer("u1")).toBe("none");

    localStorage.clear();
    // Mastery unreadable and nothing remembered: unknown history is never treated as "new", so nothing is offered.
    const unknown = await boot({ states: {}, posts: [], online: true, masteryFails: true });
    expect(await unknown.calibration.getWarmupOffer("u1")).toBe("none");
  });
});
