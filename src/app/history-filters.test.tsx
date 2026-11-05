import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/history",
}));

const BLUEPRINTS = {
  blueprints: [
    {
      key: "cat", name: "CAT", scoring: "raw", negative_marking: true, total_minutes: 120, max_raw: 198, scaled_total: null, notes: "",
      sections: [
        { key: "varc", name: "Verbal Ability and Reading Comprehension", questions: 24, minutes: 40 },
        { key: "qa", name: "Quantitative Ability", questions: 22, minutes: 40 },
      ],
    },
  ],
};

async function renderHistory(mock: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", mock ? "true" : "false");
  const { default: Page } = await import("@/app/(app)/settings/history/page");
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

const options = () => Array.from((screen.getByLabelText("Filter by topic") as HTMLSelectElement).options).map((o) => o.textContent);

describe("History topic filters come from the backend blueprints in real mode", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/mocks/history") return { attempts: [] };
      if (path === "/mocks/blueprints") return BLUEPRINTS;
      throw new Error(`unexpected GET ${path}`);
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("offers All Topics plus exactly the real blueprint sections, and requests the blueprints", async () => {
    await renderHistory(false);
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/mocks/blueprints"));
    await waitFor(() => expect(options()).toEqual(["All Topics", "Verbal Ability", "Quantitative Aptitude"]));
  });

  it("shows no fixture topics while loading or if the blueprints fail: only All Topics", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/mocks/history") return { attempts: [] };
      throw new Error("blueprints down");
    });
    await renderHistory(false);
    await screen.findByLabelText("Filter by topic");
    await new Promise((r) => setTimeout(r, 100));
    expect(options()).toEqual(["All Topics"]);
  });

  it("explicit mock mode keeps the fixture filters and makes no request", async () => {
    await renderHistory(true);
    const { getTopicFilters } = await import("@/lib/mock/history");
    await waitFor(() => expect(options()).toEqual(getTopicFilters("cat").map((f) => f.label)));
    expect(apiGet).not.toHaveBeenCalled();
  });
});
