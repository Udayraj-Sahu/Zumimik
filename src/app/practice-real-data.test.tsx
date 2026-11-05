import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cold dynamic imports of the page can exceed the 5s default when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/learn/practice",
}));

const CATALOG = {
  skills: [
    { skill: "Fractions and Decimals", servable: 12, feeds_mastery: 12, by_difficulty: {}, generated: 0, parents: [] },
    { skill: "Empty Skill", servable: 0, feeds_mastery: 0, by_difficulty: {}, generated: 0, parents: [] },
  ],
};

const ITEM = {
  source: "tier1_static",
  template_id: "t1",
  question_text: "7 x 8 = ?",
  difficulty: 2,
  skill: "Fractions and Decimals",
  technique: null,
  topic: null,
  sub_topic: null,
  trust: "trusted",
  feeds_mastery: true,
  answer_check: "client_extract",
  expected_answer: 56,
};

class FakeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function setup(mock = false, signedIn = false) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", mock ? "true" : "false");
  const { default: PracticePage } = await import("@/app/(app)/learn/practice/page");
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  if (signedIn) {
    // Only the hint helper needs a signed-in learner (its policy is asked per user); the sync tests keep the signed-out path.
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
  }
  const { ApiError } = await import("@/services/api");
  useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={client}>
      <PracticePage />
    </QueryClientProvider>,
  );
  return { view, invalidate, ApiError };
}

function routeApi(opts: { catalog?: unknown; session?: unknown; sync?: unknown } = {}) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/chat/policy") return { hints_only: true, rag: false, llm_enabled: false, model: null, daily_token_budget: 20000, budget_remaining: 20000, usage_today: {} };
    if (path === "/practice/catalog") {
      if (opts.catalog instanceof Error) throw opts.catalog;
      return opts.catalog ?? CATALOG;
    }
    throw new Error(`unexpected GET ${path}`);
  });
  apiPost.mockImplementation(async (path: string) => {
    const value = path === "/sync" ? opts.sync : opts.session;
    if (value instanceof Error) throw value;
    return value ?? (path === "/sync" ? { accepted: 2 } : { items: [ITEM], summary: { requested: 10, served: 1 } });
  });
}

async function startSession() {
  fireEvent.click(await screen.findByRole("button", { name: "Select Fractions and Decimals" }));
  fireEvent.click(screen.getByRole("button", { name: /Start Practice/ }));
}

describe("/learn/practice against the backend (real mode)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/mock/sprint-session");
  });

  describe("catalog", () => {
    it("lists the real catalog skills and hides those with nothing servable", async () => {
      routeApi();
      await setup();
      expect(await screen.findByRole("button", { name: "Select Fractions and Decimals" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Select Empty Skill" })).not.toBeInTheDocument();
      expect(apiGet).toHaveBeenCalledWith("/practice/catalog");
    });

    it("shows a loading state while the catalog is pending", async () => {
      apiGet.mockReturnValue(new Promise(() => {}));
      await setup();
      expect(await screen.findByTestId("topics-loading")).toBeInTheDocument();
    });

    it("shows an error with a working retry when the catalog fails", async () => {
      routeApi({ catalog: new Error("boom") });
      await setup();
      expect(await screen.findByTestId("topics-error")).toBeInTheDocument();
      const before = apiGet.mock.calls.length;
      routeApi();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByRole("button", { name: "Select Fractions and Decimals" })).toBeInTheDocument();
      expect(apiGet.mock.calls.length).toBeGreaterThan(before);
    });

    it("shows an empty state for an empty catalog", async () => {
      routeApi({ catalog: { skills: [] } });
      await setup();
      expect(await screen.findByTestId("topics-empty")).toBeInTheDocument();
    });
  });

  describe("session", () => {
    it("is not requested until Start; then POSTs the skill as a slot and renders the question from the API", async () => {
      routeApi();
      await setup();
      fireEvent.click(await screen.findByRole("button", { name: "Select Fractions and Decimals" }));
      expect(apiPost).not.toHaveBeenCalledWith("/practice/session", expect.anything());
      fireEvent.click(screen.getByRole("button", { name: /Start Practice/ }));

      expect(await screen.findByText("7 x 8 = ?")).toBeInTheDocument();
      expect(apiPost).toHaveBeenCalledWith("/practice/session", {
        slots: [{ skill: "Fractions and Decimals", bucket: "primary", n: 10 }],
      });
      // The backend serves free-text items (no choices): an answer input, no fabricated options.
      expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
    });

    it("a question without its own hint offers a server hint for that problem (POST /chat/query)", async () => {
      routeApi();
      const sessionAndHint = apiPost.getMockImplementation()!;
      apiPost.mockImplementation(async (path: string, body: unknown) =>
        path === "/chat/query"
          ? { template_id: "t1", mode: "hint_ladder", answer_withheld: true, level: 1, max_level: 1, hint: "Think about which method fits.", budget_remaining: 20000 }
          : sessionAndHint(path, body),
      );
      await setup(false, true);
      await startSession();
      expect(await screen.findByText("7 x 8 = ?")).toBeInTheDocument();
      fireEvent.click(await screen.findByRole("button", { name: "Need a hint?" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/chat/query", { template_id: "t1", level: 1 }));
      expect(await screen.findByText("Think about which method fits.")).toBeInTheDocument();
    });

    it("renders no invented choices: the backend serves free-text items", async () => {
      routeApi();
      await setup();
      await startSession();
      await screen.findByText("7 x 8 = ?");
      expect(screen.queryByRole("button", { name: /^A\b/ })).not.toBeInTheDocument();
    });

    it("an unauthorized or server error shows the error with Retry — never a fake session", async () => {
      const mockFixture = vi.fn();
      vi.doMock("@/lib/mock/sprint-session", () => {
        mockFixture();
        return { generateSprintSession: () => ({ questions: [] }) };
      });
      routeApi();
      const { ApiError } = await setup();
      apiPost.mockImplementation(async (path: string) => {
        if (path === "/practice/session") throw new ApiError(401, "Not authenticated");
        return {};
      });
      await startSession();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Not authenticated");
      expect(screen.queryByText("7 x 8 = ?")).not.toBeInTheDocument();
      expect(mockFixture).not.toHaveBeenCalled();

      apiPost.mockImplementation(async () => ({ items: [ITEM], summary: { requested: 10, served: 1 } }));
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByText("7 x 8 = ?")).toBeInTheDocument();
    });

    it("an empty session shows an explanatory empty state", async () => {
      routeApi({ session: { items: [], summary: { requested: 10, served: 0, withheld: {} } } });
      await setup();
      await startSession();
      expect(await screen.findByTestId("session-empty")).toBeInTheDocument();
    });

    it("a 503 shows the server error after exactly one retry (no retry loop)", async () => {
      routeApi();
      const { ApiError } = await setup();
      apiPost.mockImplementation(async () => {
        throw new ApiError(503, "content unavailable: OperationalError");
      });
      await startSession();
      expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("content unavailable");
      const sessionCalls = apiPost.mock.calls.filter(([path]) => path === "/practice/session").length;
      expect(sessionCalls).toBe(2);
    });

    it("a 401 is not retried", async () => {
      routeApi();
      const { ApiError } = await setup();
      apiPost.mockImplementation(async () => {
        throw new ApiError(401, "Not authenticated");
      });
      await startSession();
      await screen.findByRole("alert");
      expect(apiPost.mock.calls.filter(([path]) => path === "/practice/session").length).toBe(1);
    });
  });

  describe("answer, completion and mastery refresh", () => {
    async function answerCorrectly() {
      await startSession();
      await screen.findByText("7 x 8 = ?");
      fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "56" } });
      fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
      expect(await screen.findByText("Correct.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /See Results/ }));
    }

    it("records the attempt through /sync, says saved only after the ack, and refreshes mastery + dashboards", async () => {
      routeApi();
      const { invalidate } = await setup();
      await answerCorrectly();

      await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("Progress saved."));
      const syncCall = apiPost.mock.calls.find(([path]) => path === "/sync");
      expect(syncCall).toBeDefined();
      const { events } = syncCall![1] as { events: Array<Record<string, any>> };
      const attempt = events.find((e) => e.event_type === "problem_attempt")!;
      expect(attempt.metadata).toMatchObject({ problem_id: "t1", skill: "Fractions and Decimals", is_correct: true });
      expect(events.some((e) => e.event_type === "session_end")).toBe(true);

      const refreshed = invalidate.mock.calls.map(([arg]) => (arg as { queryKey: string[] }).queryKey[0]);
      expect(refreshed).toEqual(expect.arrayContaining(["adaptive-state", "dashboard", "account-summary", "sprint"]));
    });

    it("signed in and offline: the batch is stored on the device and the UI says so, never \"Progress saved\"", async () => {
      localStorage.setItem("zuzumik-auth", JSON.stringify({ state: { user: { id: "u1", name: "A", email: "a@x.com", role: "user" }, token: "t", refreshToken: "r", isAuthenticated: true, isOnboarded: false }, version: 0 }));
      routeApi({ sync: new TypeError("Failed to fetch") });
      const { invalidate } = await setup();
      await answerCorrectly();
      await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("Saved on this device"));
      expect(screen.getByTestId("sync-status")).not.toHaveTextContent("Progress saved");
      expect(invalidate).not.toHaveBeenCalled();
      const { db } = await import("@/services/offline/db");
      expect(await db.eventQueue.count()).toBe(1);
    });

    it("does not claim saved when /sync fails; Retry re-sends the SAME event ids and then refreshes", async () => {
      routeApi({ sync: new FakeApiError(503, "down") });
      const { invalidate } = await setup();
      await answerCorrectly();

      await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("Couldn't save your progress."));
      expect(screen.getByTestId("sync-status")).not.toHaveTextContent("Progress saved.");
      expect(invalidate).not.toHaveBeenCalled();

      routeApi();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await waitFor(() => expect(screen.getByTestId("sync-status")).toHaveTextContent("Progress saved."));
      const sends = apiPost.mock.calls.filter(([path]) => path === "/sync").map(([, body]) => body as { events: Array<{ event_id: string }> });
      expect(sends.length).toBe(2);
      expect(sends[1].events.map((e) => e.event_id)).toEqual(sends[0].events.map((e) => e.event_id));
    });
  });
});

describe("/learn/practice in explicit mock mode", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/mock/sprint-session");
  });

  it("still runs from the development fixtures without calling the backend", async () => {
    await setup(true);
    const { getTopicsByDomain } = await import("@/lib/mock/sprint");
    const first = getTopicsByDomain("cat")[0];
    fireEvent.click(await screen.findByRole("button", { name: `Select ${first.label}` }));
    fireEvent.click(screen.getByRole("button", { name: /Start Practice/ }));
    await waitFor(() => expect(screen.getByText(/Practice\s*·/)).toBeInTheDocument(), { timeout: 4000 });
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
