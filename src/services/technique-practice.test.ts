import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));

const mk = (id: string, skill: string) => ({ source: "tier1_static", template_id: id, question_text: id, difficulty: 2, skill, technique: null, topic: null, sub_topic: null, trust: "trusted", feeds_mastery: true, answer_check: "client_extract", expected_answer: 1 });

async function run(first: ReturnType<typeof mk>[], fallback: ReturnType<typeof mk>[] | Error) {
  vi.resetModules();
  const apiGet = vi.fn(async (path: string) => {
    if (path === "/practice/mastery") return { technique_states: {}, as_of: null };
    if (path === "/practice/catalog") return { skills: [{ skill: "Fractions", parents: [], servable: 9 }] };
    if (path.startsWith("/practice/session?size=")) {
      if (fallback instanceof Error) throw fallback;
      return { items: fallback, summary: { requested: 0, served: fallback.length } };
    }
    throw new Error("unexpected " + path);
  });
  const apiPost = vi.fn(async () => ({ items: first, summary: { requested: 5, served: first.length } }));
  vi.doMock("@/services/api", () => ({ apiGet, apiPost }));
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1" } as never });
  const practice = await import("@/services/practice");
  return { practice, apiGet, apiPost };
}

describe("practising a selected technique", () => {
  beforeEach(() => localStorage.clear());

  it("asks only for that technique", async () => {
    const { practice, apiPost } = await run([mk("a", "Fractions")], []);
    await practice.getPracticeSession("Fractions", 5, "Adaptive");
    const slots = (apiPost.mock.calls[0] as unknown as [string, { slots: Array<{ skill: string; n: number }> }])[1].slots;
    expect(slots).toEqual([expect.objectContaining({ skill: "Fractions", n: 5 })]);
  });

  it("a short session is topped up only with that technique's own questions, never another's", async () => {
    const { practice, apiGet } = await run([mk("a", "Fractions")], [mk("b", "Geometry"), mk("c", "Fractions"), mk("d", "Algebra")]);
    const session = await practice.getPracticeSession("Fractions", 5, "Adaptive");
    expect(apiGet).toHaveBeenCalledWith("/practice/session?size=4"); // the top-up is still attempted
    expect(session.questions.map((q) => q.id)).toEqual(["a", "c"]);
    expect(session.questions.every((q) => q.skillId === "Fractions")).toBe(true);
  });

  it("when the top-up has nothing of that technique the session stays short", async () => {
    const { practice } = await run([mk("a", "Fractions")], [mk("b", "Geometry")]);
    const session = await practice.getPracticeSession("Fractions", 5, "Adaptive");
    expect(session.questions.map((q) => q.id)).toEqual(["a"]);
  });

  it("a failing top-up never breaks the session", async () => {
    const { practice } = await run([mk("a", "Fractions")], new Error("boom"));
    expect((await practice.getPracticeSession("Fractions", 5, "Adaptive")).questions).toHaveLength(1);
  });

  it("the personalised mix may be topped up from anywhere", async () => {
    const { practice } = await run([mk("a", "Fractions")], [mk("b", "Geometry")]);
    const session = await practice.getPracticeSession(practice.ADAPTIVE_MIX_TOPIC, 5, "Adaptive");
    expect(session.questions.map((q) => q.id)).toEqual(["a", "b"]);
  });
});
