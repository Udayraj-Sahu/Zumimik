import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
class FakeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  ApiError: FakeApiError,
}));

const HINT = (level: number, max: number, extra: Record<string, unknown> = {}) => ({
  template_id: "t1", mode: "hint_ladder", answer_withheld: true, level, max_level: max, hint: `Hint text ${level}`, leak_redacted: false, budget_remaining: 20000, ...extra,
});

const POLICY = { hints_only: true, rag: false, llm_enabled: false, model: null, daily_token_budget: 20000, budget_remaining: 20000, usage_today: {} };

async function mount(opts: { flags?: Record<string, unknown>; disabled?: boolean; mock?: boolean; policy?: unknown } = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", opts.mock ? "true" : "false");
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/config") return { flags: opts.flags ?? { chatbot: { enabled: true, rollout_pct: 100 } } };
    if (path === "/chat/policy") {
      if (opts.policy instanceof Error) throw opts.policy;
      return opts.policy ?? POLICY;
    }
    throw new Error("unexpected GET " + path);
  });
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
  const { ServerHintPanel } = await import("@/components/practice/server-hint");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ServerHintPanel templateId="t1" disabled={opts.disabled} />
    </QueryClientProvider>,
  );
}

describe("ServerHintPanel (POST /chat/query)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("asks for level 1 for this problem, then offers another hint up to the server's max level", async () => {
    apiPost.mockImplementation(async (_p: string, body: { level: number }) => HINT(body.level, 3));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Need a hint?" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/chat/query", { template_id: "t1", level: 1 }));
    expect(await screen.findByTestId("server-hint-text")).toHaveTextContent("Hint text 1");
    expect(screen.getByTestId("server-hint")).toHaveTextContent("Hint 1 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
    await waitFor(() => expect(apiPost).toHaveBeenLastCalledWith("/chat/query", { template_id: "t1", level: 2 }));
    expect(await screen.findByText("Hint text 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Another hint" }));
    expect(await screen.findByText("Hint text 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Another hint" })).not.toBeInTheDocument(); // top of the ladder
  });

  it("a problem with only one safe hint (max_level 1) offers no second one, and shows the server's notice", async () => {
    apiPost.mockResolvedValue(HINT(1, 1, { notice: "No worked step from the book was safe to show for this problem, so these hints are about the method only." }));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Need a hint?" }));
    expect(await screen.findByTestId("server-hint-text")).toHaveTextContent("Hint text 1");
    expect(screen.getByTestId("server-hint")).toHaveTextContent("about the method only");
    expect(screen.queryByRole("button", { name: "Another hint" })).not.toBeInTheDocument();
    expect(screen.getByTestId("server-hint")).not.toHaveTextContent("1 of 1");
  });

  it("is absent while the chatbot flag is off, once the question is answered, and in mock mode", async () => {
    await mount({ flags: { chatbot: { enabled: false, rollout_pct: 100 } } });
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/api/config"));
    await new Promise((r) => setTimeout(r, 50)); // let the flag list land
    expect(screen.queryByTestId("server-hint")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Need a hint?" })).not.toBeInTheDocument();
  });

  it("asks GET /chat/policy first, and shows the button only when the server says hints are on for this learner", async () => {
    await mount();
    expect(await screen.findByRole("button", { name: "Need a hint?" })).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith("/chat/policy");
    expect(apiPost).not.toHaveBeenCalled(); // no hint is requested until the learner asks
  });

  it("no button when the policy is refused (switched off for this learner, e.g. a partial rollout)", async () => {
    await mount({ policy: new FakeApiError(404, "not found") });
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/chat/policy"));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("button", { name: "Need a hint?" })).not.toBeInTheDocument();
  });

  it("an used-up daily budget does not remove the button: the rule-based ladder stays available", async () => {
    await mount({ policy: { ...POLICY, llm_enabled: true, budget_remaining: 0 } });
    expect(await screen.findByRole("button", { name: "Need a hint?" })).toBeInTheDocument();
  });

  it("is absent after the answer is revealed", async () => {
    await mount({ disabled: true });
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.queryByTestId("server-hint")).not.toBeInTheDocument();
  });

  it("is absent in explicit mock mode (mock questions carry their own hints)", async () => {
    await mount({ mock: true });
    expect(screen.queryByTestId("server-hint")).not.toBeInTheDocument();
  });

  it("explains a failed request (unknown problem / budget) and lets the learner try again", async () => {
    apiPost.mockRejectedValueOnce(new FakeApiError(404, "unknown problem"));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Need a hint?" }));
    expect(await screen.findByTestId("server-hint-error")).toHaveTextContent("No hint is available for this problem.");
    apiPost.mockResolvedValueOnce(HINT(1, 1));
    fireEvent.click(screen.getByRole("button", { name: "Need a hint?" }));
    expect(await screen.findByTestId("server-hint-text")).toBeInTheDocument();
  });

  it("shows the server's own message when the daily budget is used up", async () => {
    apiPost.mockRejectedValueOnce(new FakeApiError(429, "daily chat budget exhausted; hints from the ladder remain available"));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Need a hint?" }));
    expect(await screen.findByTestId("server-hint-error")).toHaveTextContent("daily chat budget exhausted");
  });
});
