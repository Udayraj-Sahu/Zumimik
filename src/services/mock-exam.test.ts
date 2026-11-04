import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost } from "./api";

vi.mock("./api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/lib/platform", () => ({ IS_MOCK: false }));

const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);

const configured = {
  mock_id: "cat_20261104_ab12cd34",
  exam: "cat",
  mode: "full",
  time_limit_seconds: 7200,
  sections: [
    {
      key: "qa",
      name: "Quantitative Ability",
      minutes: 40,
      questions: [
        { question_id: "q1", kind: "mcq", text: "2+2?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }], position: 1 },
        { question_id: "q2", kind: "tita", text: "Type 5", options: null, position: 2 },
      ],
    },
  ],
};

describe("mock exam lifecycle follows the backend contract", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("starts via POST /mocks/configure and never calls the nonexistent /mock-exam/session route", async () => {
    const { getMockPaperSession } = await import("./mock-exam");
    post.mockResolvedValueOnce(configured as never);
    const session = await getMockPaperSession("cat", "cat");
    expect(post).toHaveBeenCalledWith("/mocks/configure", { exam: "cat", mode: "full", practice: false });
    expect(get).not.toHaveBeenCalled();
    expect(session.mockId).toBe("cat_20261104_ab12cd34");
    expect(session.totalTime).toBe(7200);
  });

  it("maps questions as server-graded: option ids kept, no local correct answer, TITA is free text", async () => {
    const { getMockPaperSession } = await import("./mock-exam");
    post.mockResolvedValueOnce(configured as never);
    const { questions } = await getMockPaperSession("cat");
    expect(questions[0]).toMatchObject({ options: ["3", "4"], optionIds: ["a", "b"], correctIndex: -1, serverGraded: true, answerType: "choice" });
    expect(questions[1]).toMatchObject({ options: [], answerType: "text", serverGraded: true });
  });

  it("records an answer with POST /mocks/submit-answer", async () => {
    const { submitMockAnswer } = await import("./mock-exam");
    post.mockResolvedValueOnce({ recorded: true } as never);
    await submitMockAnswer("m1", "q1", "b", 1200);
    expect(post).toHaveBeenCalledWith("/mocks/submit-answer", { mock_id: "m1", question_id: "q1", answer: "b", time_ms: 1200 });
  });

  it("submits, then reads server verdicts from /mocks/results — it never grades locally", async () => {
    const { getMockPaperSession, submitMock } = await import("./mock-exam");
    post.mockResolvedValueOnce(configured as never);
    const { questions } = await getMockPaperSession("cat");

    post.mockResolvedValueOnce({ mock_id: "m1", xp_awarded: 70 } as never);
    get.mockResolvedValueOnce({
      mock_id: "m1",
      review: [
        { question_id: "q1", your_answer: "b", verdict: true, time_ms: 4000 },
        { question_id: "q2", your_answer: null, verdict: null, time_ms: null },
      ],
    } as never);

    const result = await submitMock({
      mockId: "m1",
      questions,
      elapsedSeconds: 61.4,
      answers: [{ question_id: "q1", answer: "b", time_ms: 4000 }],
    });
    expect(post).toHaveBeenLastCalledWith("/mocks/submit", {
      mock_id: "m1",
      answers: [{ question_id: "q1", answer: "b", time_ms: 4000 }],
      elapsed_seconds: 61,
    });
    expect(get).toHaveBeenLastCalledWith("/mocks/results/m1");
    expect(result).toMatchObject({ score: 1, total: 2, accuracy: 100, xpEarned: 70 });
    expect(result.answers[0]).toMatchObject({ selectedIndex: 1, correct: true });
    expect(result.answers[1]).toMatchObject({ selectedIndex: -1, correct: null });
  });

  it("surfaces a submit failure instead of fabricating a result", async () => {
    const { submitMock } = await import("./mock-exam");
    post.mockRejectedValueOnce(new Error("mock is completed"));
    await expect(submitMock({ mockId: "m1", questions: [], answers: [], elapsedSeconds: 1 })).rejects.toThrow("mock is completed");
    expect(get).not.toHaveBeenCalled();
  });
});

describe("profile reads the backend /auth/me envelope", () => {
  it("unwraps { user } so the real name and tier are shown", async () => {
    const { getProfile } = await import("./profile");
    get.mockReset();
    get.mockImplementation((async (path: string) =>
      path === "/auth/me"
        ? { user: { id: "1", name: "Ada Lovelace", email: "a@x.com", role: "user", tier: "pro" } }
        : { current: 3, xp: 1200 }) as never);
    const profile = await getProfile();
    expect(profile).toMatchObject({ name: "Ada Lovelace", initials: "AL", badge: "pro" });
  });
});
