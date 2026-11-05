import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { levelToTheta } from "@/services/practice";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
let params = new URLSearchParams({ topic: "Fractions and Decimals", length: "5", difficulty: "beginner" });

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/play/sprint",
}));

const ITEM = {
  source: "tier1_static", template_id: "t1", question_text: "12 x 12 = ?", difficulty: 2, skill: "Fractions and Decimals",
  technique: null, topic: null, sub_topic: null, trust: "trusted", feeds_mastery: true, answer_check: "client_extract", expected_answer: 144,
};

async function renderSprint() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { default: Page } = await import("@/app/(app)/play/sprint/page");
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("/play/sprint requests sessions with the verified slot contract", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
    params = new URLSearchParams({ topic: "Fractions and Decimals", length: "5", difficulty: "beginner" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("POSTs the skill as a slot (never GET ?topic=) and renders the backend question", async () => {
    apiPost.mockResolvedValue({ items: [ITEM], summary: { requested: 5, served: 1 } });
    await renderSprint();
    expect(await screen.findByText("12 x 12 = ?")).toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledWith("/practice/session", {
      slots: [{ skill: "Fractions and Decimals", bucket: "primary", n: 5 }],
      theta: levelToTheta(2), // Beginner targets level 2
    });
    // The backend served 1 of 5, so the safety net tops up from the general session endpoint (size = the 4 missing); never ?topic=.
    expect(apiGet.mock.calls.some(([p]) => String(p).includes("/practice/session?topic="))).toBe(false);
    expect(apiGet).toHaveBeenCalledWith("/practice/session?size=4");
  });

  it("an empty session shows an explanation instead of a blank exam", async () => {
    apiPost.mockResolvedValue({ items: [], summary: { requested: 5, served: 0 } });
    await renderSprint();
    expect(await screen.findByTestId("sprint-empty")).toBeInTheDocument();
  });

  it("Retry after a server error requests the session again (it used to call router.refresh, a no-op)", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValueOnce(new ApiError(401, "Not authenticated"));
    await renderSprint();
    expect(await screen.findByText("Failed to load sprint questions.")).toBeInTheDocument();
    apiPost.mockResolvedValue({ items: [ITEM], summary: { requested: 5, served: 1 } });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("12 x 12 = ?")).toBeInTheDocument();
  });
});
