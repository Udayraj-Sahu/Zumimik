import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
const push = vi.fn();
let params = new URLSearchParams({ paper: "cat", domain: "cat" });

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/learn/mock/run",
}));

const CONFIGURED = {
  mock_id: "m1", exam: "cat", mode: "full", time_limit_seconds: 7200,
  sections: [
    {
      key: "qa", name: "Quantitative Ability", minutes: 40,
      questions: [
        { question_id: "q1", kind: "mcq", text: "2+2?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }], position: 1 },
        { question_id: "q2", kind: "tita", text: "What is 6 x 7?", options: null, position: 2 },
      ],
    },
  ],
};

async function renderRun() {
  vi.resetModules();
  const { default: Page } = await import("@/app/(app)/learn/mock/run/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("mock exam: typed (TITA) answers", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    localStorage.clear();
    apiPost.mockImplementation(async (path: string) => {
      if (path === "/mocks/configure") return CONFIGURED;
      if (path === "/mocks/submit-answer") return { recorded: true };
      if (path === "/mocks/submit") return { mock_id: "m1", xp_awarded: 10 };
      throw new Error(`unexpected POST ${path}`);
    });
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/mocks/results/m1") {
        return { mock_id: "m1", review: [
          { question_id: "q1", your_answer: "b", verdict: true, time_ms: 1000 },
          { question_id: "q2", your_answer: "42", verdict: true, time_ms: 2000 },
        ] };
      }
      throw new Error(`unexpected GET ${path}`);
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("a question with no options shows an answer input; the typed text is sent as-is and graded by the server", async () => {
    await renderRun();
    fireEvent.click(await screen.findByText("4"));
    expect(await screen.findByText("What is 6 x 7?", {}, { timeout: 3000 })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Type your answer"), { target: { value: " 42 " } });
    fireEvent.click(screen.getByRole("button", { name: /Submit answer and finish/ }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/mocks/submit-answer", { mock_id: "m1", question_id: "q2", answer: "42", time_ms: expect.any(Number) }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/mocks/submit", expect.objectContaining({ mock_id: "m1" })));
    const submit = apiPost.mock.calls.find(([p]) => p === "/mocks/submit")![1] as { answers: Array<{ question_id: string; answer: string }> };
    expect(submit.answers).toEqual([
      expect.objectContaining({ question_id: "q1", answer: "b" }),
      expect.objectContaining({ question_id: "q2", answer: "42" }),
    ]);
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("the Submit button is disabled until something is typed, and no verdict is shown to the learner", async () => {
    await renderRun();
    fireEvent.click(await screen.findByText("4"));
    await screen.findByText("What is 6 x 7?", {}, { timeout: 3000 });
    expect(screen.getByRole("button", { name: /Submit answer and finish/ })).toBeDisabled();
    expect(screen.queryByText(/Correct|Not quite/)).not.toBeInTheDocument();
  });

  it("Back and Next move between questions, and a chosen answer is still shown when you return", async () => {
    await renderRun();
    expect(await screen.findByText("2+2?")).toBeInTheDocument();
    expect(screen.getByTestId("mock-prev")).toBeDisabled();
    fireEvent.click(screen.getByTestId("mock-next")); // skip without answering
    expect(await screen.findByText("What is 6 x 7?")).toBeInTheDocument();
    expect(screen.getByTestId("mock-finish")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("mock-prev"));
    expect(await screen.findByText("2+2?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("4"));
    await screen.findByText("What is 6 x 7?", {}, { timeout: 3000 }); // answering auto-advances
    fireEvent.click(screen.getByTestId("mock-prev"));
    expect(await screen.findByText("2+2?")).toBeInTheDocument();
    expect(screen.getByText("4").closest("button")).toHaveClass("text-primary"); // the earlier choice is highlighted
  });
});
