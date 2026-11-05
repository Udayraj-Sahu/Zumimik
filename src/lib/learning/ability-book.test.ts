import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshThetaState, recordResponse, refitTheta, type ThetaState } from "@vmsg/psychometrics";
import { abilityForRequest, applyAbilityBook, mergeBook, mergeThetaStates, remoteAbilityOf, restoreBook, sendableAbility, subjectOfItem } from "./ability-book";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const q = (id: string, subject?: string, extra: Partial<Question> = {}) =>
  ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId: "S", feedsMastery: true, trustStatus: "trusted" as const, difficulty: 3, subject, ...extra }) as Question & { subject?: unknown };
const a = (questionId: string, correct: boolean): SprintAnswer => ({ questionId, selectedIndex: 0, correct, timeSpent: 5 });

function stateOf(subject: "quant" | "di", ids: string[], correct = true): ThetaState {
  let s = freshThetaState(subject);
  for (const id of ids) s = recordResponse(s, { problemId: id, a: 1, b: 0, correct });
  return s;
}

describe("which subject an item belongs to", () => {
  it("only the subjects the backend names; anything else is unclassified, never quant", () => {
    expect(subjectOfItem("quant")).toBe("quant");
    expect(subjectOfItem("di")).toBe("di");
    for (const v of [undefined, null, "", "Quant", "varc", 3, {}]) expect(subjectOfItem(v)).toBe("unclassified");
  });
});

describe("recording a session into the book", () => {
  it("each answer goes to its own subject, unnamed items go to unclassified, and nothing leaks across", () => {
    const qs = [q("a1", "quant"), q("a2", "quant"), q("d1", "di"), q("u1")];
    const book = applyAbilityBook({}, qs, [a("a1", true), a("a2", true), a("d1", false), a("u1", true)]);
    expect(book.quant?.responses.map((r) => r.problemId)).toEqual(["a1", "a2"]);
    expect(book.di?.responses.map((r) => r.problemId)).toEqual(["d1"]);
    expect(book.unclassified?.responses.map((r) => r.problemId)).toEqual(["u1"]);
    expect(book.quant!.theta).toBeGreaterThan(0);
    expect(book.di!.theta).toBeLessThan(0);
  });

  it("returns the same object when nothing counted (ungraded, sandbox, repeats)", () => {
    const book = applyAbilityBook({}, [q("a1", "quant")], [a("a1", true)]);
    expect(applyAbilityBook(book, [q("a1", "quant")], [a("a1", true)])).toBe(book); // a repeat of a problem already scored
    const none = {};
    expect(applyAbilityBook(none, [q("x", "quant", { trustStatus: "sandbox" })], [a("x", true)])).toBe(none);
  });

  it("only quant and di are ever sent, each stamped with its own subject; unclassified never is", () => {
    const book = applyAbilityBook({}, [q("a1", "quant"), q("d1", "di"), q("u1")], [a("a1", true), a("d1", true), a("u1", true)]);
    const sent = sendableAbility(book);
    expect(Object.keys(sent).sort()).toEqual(["di", "quant"]);
    expect(sent.quant!.subject).toBe("quant");
    expect(sent.di!.subject).toBe("di");
    expect(sendableAbility({ unclassified: book.unclassified })).toEqual({});
    expect(sendableAbility({})).toEqual({});
  });
});

describe("what is stored on the device", () => {
  it("the earlier single-state format (recorded before items had a subject) is read as unclassified, not quant", () => {
    const legacy = stateOf("quant", ["p1", "p2", "p3"]);
    const book = restoreBook(JSON.parse(JSON.stringify(legacy)));
    expect(book.quant).toBeUndefined();
    expect(book.unclassified?.n).toBe(3);
  });

  it("rebuilds every state from its responses, so a tampered theta cannot survive", () => {
    const real = stateOf("quant", ["p1", "p2"]);
    const book = restoreBook(JSON.parse(JSON.stringify({ quant: { ...real, theta: 2.9, n: 99 }, di: { nope: 1 } })));
    expect(book.quant!.theta).toBeCloseTo(refitTheta(real.responses).theta, 10);
    expect(book.quant!.n).toBe(2);
    expect(book.di).toBeUndefined();
    expect(restoreBook(null)).toEqual({});
    expect(restoreBook("x")).toEqual({});
  });
});

describe("combining this device's evidence with the server's", () => {
  it("is a union of responses by problem, never an average of estimates, and refits through the engine", () => {
    const server = stateOf("quant", ["a", "b", "c"]);
    const local = stateOf("quant", ["c", "d"]); // c was answered on both devices
    const merged = mergeThetaStates(server, local, "quant")!;
    expect(merged.responses.map((r) => r.problemId)).toEqual(["a", "b", "c", "d"]);
    expect(merged.theta).toBeCloseTo(refitTheta(merged.responses).theta, 10);
    expect(merged.n).toBe(4);
  });

  it("is deterministic: the same inputs always give the same result, and the first attempt of a problem wins", () => {
    const server = { ...stateOf("quant", ["p"], true) };
    const local = stateOf("quant", ["p"], false); // a different verdict for the same problem
    const one = mergeThetaStates(server, local, "quant")!;
    const two = mergeThetaStates(server, local, "quant")!;
    expect(one).toEqual(two);
    expect(one.responses).toHaveLength(1);
    expect(one.responses[0].correct).toBe(true); // the server's (older) record is the first attempt
  });

  it("keeps only the latest 200 responses", () => {
    const ids = Array.from({ length: 150 }, (_, i) => `s${i}`);
    const server = stateOf("quant", ids);
    const local = stateOf("quant", Array.from({ length: 150 }, (_, i) => `l${i}`));
    const merged = mergeThetaStates(server, local, "quant")!;
    expect(merged.responses).toHaveLength(200);
    expect(merged.responses[199].problemId).toBe("l149"); // the newest are kept
    expect(merged.responses[0].problemId).toBe("s100"); // 300 combined, the oldest 100 dropped
  });

  it("with nothing on either side there is nothing", () => {
    expect(mergeThetaStates(undefined, undefined, "quant")).toBeUndefined();
    expect(mergeThetaStates(freshThetaState("quant"), undefined, "quant")).toBeUndefined();
  });

  it("subjects stay apart: merging quant evidence never touches di, and unclassified is never merged", () => {
    const local = { quant: stateOf("quant", ["a"]), di: stateOf("di", ["d"]), unclassified: stateOf("quant", ["u"]) };
    const remote = { quant: stateOf("quant", ["b"]) };
    const out = mergeBook(local, remote);
    expect(out.quant!.responses.map((r) => r.problemId)).toEqual(["b", "a"]);
    expect(out.di).toEqual(local.di);
    expect(out.unclassified).toEqual(local.unclassified);
  });
});

describe("what the server returns (integration boundary, contract pending)", () => {
  it("no theta field: nothing changes (the current backend)", () => {
    expect(remoteAbilityOf({ technique_states: {}, as_of: null })).toEqual({});
    expect(remoteAbilityOf(null)).toEqual({});
    expect(remoteAbilityOf({ theta: null })).toEqual({});
    expect(remoteAbilityOf({ theta: [] })).toEqual({});
  });

  it("accepts the agreed per-subject shape and ignores unknown subjects and invalid states", () => {
    const good = JSON.parse(JSON.stringify(stateOf("quant", ["a", "b"])));
    const out = remoteAbilityOf({ theta: { quant: good, di: { theta: 9, responses: "no" }, varc: good, Quant: good } });
    expect(Object.keys(out)).toEqual(["quant"]);
    expect(out.quant!.n).toBe(2);
  });

  it("the server's own theta and se are not trusted: the state is rebuilt from its responses", () => {
    const real = JSON.parse(JSON.stringify(stateOf("quant", ["a", "b"])));
    const out = remoteAbilityOf({ theta: { quant: { ...real, theta: 2.99, se: 0.001, n: 500 } } });
    expect(out.quant!.theta).toBeCloseTo(refitTheta(real.responses).theta, 10);
    expect(out.quant!.n).toBe(2);
  });
});

describe("the theta sent with a session request", () => {
  const book = { quant: stateOf("quant", ["a", "b", "c"]), di: stateOf("di", ["d", "e"], false), unclassified: stateOf("quant", ["u"]) };
  it("one named subject uses that subject's estimate", () => {
    expect(abilityForRequest(book, ["quant", "quant"])).toBeGreaterThan(0);
    expect(abilityForRequest(book, ["di"])).toBeLessThan(0);
  });
  it("no named subject uses the unclassified estimate, so sessions keep adapting on the current backend", () => {
    expect(abilityForRequest(book, ["unclassified"])).toBeGreaterThan(0);
    expect(abilityForRequest({}, ["unclassified"])).toBeUndefined();
  });
  it("a mix of subjects, or of named and unnamed, gets none: one number cannot stand for several abilities", () => {
    expect(abilityForRequest(book, ["quant", "di"])).toBeUndefined();
    expect(abilityForRequest(book, ["quant", "unclassified"])).toBeUndefined();
  });
  it("is undefined until something has been scored for that subject", () => {
    expect(abilityForRequest({ quant: stateOf("quant", ["a"]) }, ["di"])).toBeUndefined();
  });
});

describe("loading the book (new device, offline, no server data)", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function load(serverTheta: unknown, readable = true) {
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
    vi.doMock("@/services/api", () => ({
      apiGet: vi.fn(async (path: string) => {
        if (path === "/practice/mastery" && readable) return { technique_states: {}, as_of: null, ...(serverTheta === undefined ? {} : { theta: serverTheta }) };
        throw new Error("offline");
      }),
      apiPost: vi.fn(),
    }));
    return import("@/services/learner");
  }

  it("a new device with nothing local recovers the learner's ability from the server", async () => {
    const server = JSON.parse(JSON.stringify({ quant: stateOf("quant", ["a", "b", "c"]) }));
    const learner = await load(server);
    const book = await learner.loadAbilityBook("u1");
    expect(book.quant!.n).toBe(3);
    expect(book.quant!.theta).toBeGreaterThan(0);
  });

  it("with no server theta the local book is returned unchanged", async () => {
    const learner = await load(undefined);
    learner.commitAbilityBook("u1", { quant: stateOf("quant", ["a"]) });
    expect((await learner.loadAbilityBook("u1")).quant!.n).toBe(1);
  });

  it("local and server evidence are combined; the server being unreadable leaves the local book", async () => {
    const server = JSON.parse(JSON.stringify({ quant: stateOf("quant", ["a", "b"]) }));
    const learner = await load(server);
    learner.commitAbilityBook("u1", { quant: stateOf("quant", ["b", "c"]) });
    expect((await learner.loadAbilityBook("u1")).quant!.responses.map((r) => r.problemId)).toEqual(["a", "b", "c"]);
    vi.resetModules();
    const offline = await load(server, false);
    expect((await offline.loadAbilityBook("u1")).quant!.responses.map((r) => r.problemId)).toEqual(["b", "c"]);
  });

  it("nothing is stored for a learner id that is empty", async () => {
    const learner = await load(undefined);
    learner.commitAbilityBook("", { quant: stateOf("quant", ["a"]) });
    expect(await learner.loadAbilityBook("")).toEqual({});
  });
});
