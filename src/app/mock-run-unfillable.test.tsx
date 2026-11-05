import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
const push = vi.fn();
const replace = vi.fn();
let params = new URLSearchParams({ paper: "cat", domain: "cat" });

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/learn/mock/run",
}));

// The exact refusal the staging server sent for CAT on 5 Nov 2026 (POST /mocks/configure with practice:false).
const REASON = "cat.varc: Verbal Ability & Reading Comprehension is 16 reading comprehension + 8 verbal ability; verbal ability: needs 8, the pool has 0";
const LABEL = "varc: rc-focused practice, not a faithful Verbal Ability & Reading Comprehension section (16 reading comprehension + 8 verbal ability): verbal ability: needs 8, the pool has 0";

const PRACTICE_PAPER = {
  mock_id: "m9", exam: "cat", mode: "full", time_limit_seconds: 7200, practice_label: LABEL,
  sections: [
    { key: "varc", name: "Verbal Ability & Reading Comprehension", minutes: 40, practice_label: LABEL,
      questions: [{ question_id: "q1", kind: "mcq", text: "Pick the best summary.", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], position: 1 }] },
  ],
};

async function renderRun() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { default: Page } = await import("@/app/(app)/learn/mock/run/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("mock exam: a paper the question bank cannot make exactly", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    replace.mockReset();
    localStorage.clear();
    params = new URLSearchParams({ paper: "cat", domain: "cat" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("explains the refusal in plain words, shows the server's reason, and offers to take it as practice", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValue(new ApiError(503, REASON));
    await renderRun();
    const box = await screen.findByTestId("mock-unfillable");
    expect(box).toHaveTextContent("can't be set up as a real exam right now");
    expect(box).toHaveTextContent("does not count toward your percentile");
    expect(screen.getByTestId("mock-unfillable-reason")).toHaveTextContent("the pool has 0");
    expect(screen.queryByText("Failed to load mock paper.")).not.toBeInTheDocument();
    // asked for the real exam, not practice
    expect(apiPost).toHaveBeenCalledWith("/mocks/configure", { exam: "cat", mode: "full", practice: false });
  });

  it("Take it as practice reopens the same paper with ?practice=1 (keeping the other parameters)", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValue(new ApiError(503, REASON));
    await renderRun();
    fireEvent.click(await screen.findByRole("button", { name: "Take it as practice" }));
    expect(replace).toHaveBeenCalledWith("/learn/mock/run?paper=cat&domain=cat&practice=1");
  });

  it("with ?practice=1 it asks the server for practice, and labels the attempt on screen", async () => {
    params = new URLSearchParams({ paper: "cat", domain: "cat", practice: "1" });
    apiPost.mockResolvedValue(PRACTICE_PAPER);
    await renderRun();
    const notice = await screen.findByTestId("mock-practice-notice");
    expect(notice).toHaveTextContent("Practice attempt.");
    expect(notice).toHaveTextContent("rc-focused practice");
    expect(notice).toHaveTextContent("does not count toward your percentile");
    expect(apiPost).toHaveBeenCalledWith("/mocks/configure", { exam: "cat", mode: "full", practice: true });
    expect(await screen.findByText("Pick the best summary.")).toBeInTheDocument();
  });

  it("a normal full paper shows no practice notice", async () => {
    apiPost.mockResolvedValue({ ...PRACTICE_PAPER, practice_label: null, sections: [{ ...PRACTICE_PAPER.sections[0], practice_label: null }] });
    await renderRun();
    expect(await screen.findByText("Pick the best summary.")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-practice-notice")).not.toBeInTheDocument();
  });

  it("any other failure keeps the plain error with Retry (no practice offer)", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValue(new ApiError(500, "boom"));
    await renderRun();
    expect(await screen.findByText("Failed to load mock paper.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take it as practice" })).not.toBeInTheDocument();
  });

  it("a 503 that is not about the question bank (e.g. the trust ladder) is not offered as practice", async () => {
    const { ApiError } = await import("@/services/api");
    const { unfillablePaperReason } = await import("@/services/mock-exam");
    expect(unfillablePaperReason(new ApiError(503, "mock exams unavailable: the content trust ladder cannot be read"))).toBeNull();
    expect(unfillablePaperReason(new ApiError(503, REASON))).toBe(REASON);
    expect(unfillablePaperReason(new ApiError(400, REASON))).toBeNull();
    expect(unfillablePaperReason(new Error(REASON))).toBeNull();
    expect(unfillablePaperReason(new ApiError(503, "cat.dilr: no combination of whole question sets adds up to exactly 20"))).not.toBeNull();
    await waitFor(() => expect(true).toBe(true));
  });
});
