import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";
import { db } from "./offline/db";
import { historyRowsFor, loadMasteryHistory, recordMasteryHistory } from "./mastery-history";
import { adviceFor, STATE_DESCRIPTION } from "@/lib/learning/mastery-view";
import type { SessionChange } from "@/lib/learning/session-change";

vi.setConfig({ testTimeout: 60000 });
const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));

const NOW = Date.now();
const DAY = 86_400_000;
const change = (rows: Array<[string, SessionChange["skills"][number]["before"], SessionChange["skills"][number]["after"]]>): SessionChange => ({
  skills: rows.map(([skill, before, after]) => ({ skill, attempts: 3, correct: 2, before, after, engineVersion: 2 })),
});

describe("the mastery timeline kept on this device", () => {
  beforeEach(async () => {
    await db.masteryHistory.clear();
  });

  it("records only real changes: a new technique, or a label that moved; a technique that held steady is not recorded", () => {
    const rows = historyRowsFor("u1", "s1", change([["A", undefined, "fractured"], ["B", "fragile", "fluid"], ["C", "fragile", "fragile"], ["D", "fluid", "fragile"]]), NOW);
    expect(rows.map((r) => [r.skill, r.before, r.after])).toEqual([["A", undefined, "fractured"], ["B", "fragile", "fluid"], ["D", "fluid", "fragile"]]);
    expect(rows[0]).toMatchObject({ id: "s1:A", userId: "u1", sessionId: "s1", at: NOW, engineVersion: 2 });
    expect("before" in rows[0]).toBe(false);
  });

  it("writes nothing without a learner or a session, or when the label is unknown", () => {
    expect(historyRowsFor("", "s1", change([["A", "fragile", "fluid"]]), NOW)).toEqual([]);
    expect(historyRowsFor("u1", "", change([["A", "fragile", "fluid"]]), NOW)).toEqual([]);
    expect(historyRowsFor("u1", "s1", change([["A", "fragile", undefined]]), NOW)).toEqual([]);
  });

  it("a repeat of the same session writes the same rows, not more", async () => {
    const c = change([["A", "fragile", "fluid"]]);
    expect(await recordMasteryHistory("u1", "s1", c, NOW)).toBe(1);
    expect(await recordMasteryHistory("u1", "s1", c, NOW)).toBe(1);
    expect(await db.masteryHistory.count()).toBe(1);
  });

  it("reads one technique's changes for one learner, newest first and limited", async () => {
    for (let i = 0; i < 7; i++) await recordMasteryHistory("u1", `s${i}`, change([["A", i % 2 ? "fragile" : "fluid", i % 2 ? "fluid" : "fragile"]]), NOW - (7 - i) * DAY);
    await recordMasteryHistory("u1", "x", change([["B", "fragile", "fluid"]]), NOW);
    await recordMasteryHistory("u2", "y", change([["A", "fragile", "fluid"]]), NOW);
    const rows = await loadMasteryHistory("u1", "A", 5);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.sessionId)).toEqual(["s6", "s5", "s4", "s3", "s2"]);
    expect(rows.every((r) => r.userId === "u1" && r.skill === "A")).toBe(true);
    expect(await loadMasteryHistory("u1", "never")).toEqual([]);
    expect(await loadMasteryHistory("", "A")).toEqual([]);
  });

  it("is recorded by the real session pipeline, once per session, and not for a technique that did not change", async () => {
    vi.resetModules();
    localStorage.clear();
    let held = freshState("Held");
    for (let i = 0; i < 30; i++) held = processAttempt(held, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 10, problemId: `h${i}`, at: NOW - DAY + i });
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/practice/mastery") return { technique_states: JSON.parse(JSON.stringify({ Held: held })), as_of: NOW - DAY };
      throw new Error("unexpected " + path);
    });
    const telemetry = await import("@/services/telemetry");
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never });
    const q = (id: string, skillId: string) => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId, feedsMastery: true, trustStatus: "trusted" as const, difficulty: 3 });
    const ans = (id: string, correct: boolean) => ({ questionId: id, selectedIndex: 0, correct, timeSpent: 4, answeredAt: Date.now() - 1000 });
    const events = await telemetry.buildSessionSyncEvents(
      { topic: "x", questions: [q("n1", "Fresh"), q("n2", "Fresh"), q("h1", "Held")] },
      { answers: [ans("n1", false), ans("n2", false), ans("h1", true)], score: 1, total: 3, accuracy: 33, totalTimeSpent: 12, xpEarned: 0 },
    );
    const sessionId = (events[events.length - 1] as { session_id: string }).session_id;
    await waitFor(async () => expect(await db.masteryHistory.count()).toBeGreaterThan(0));
    const rows = await db.masteryHistory.toArray();
    expect(rows.map((r) => r.skill)).toEqual(["Fresh"]); // Held stayed Fluid: no entry
    expect(rows[0]).toMatchObject({ id: `${sessionId}:Fresh`, after: "fractured" });
    expect("before" in rows[0]).toBe(false); // first time the learner met it
  });
});

describe("what to do about a technique", () => {
  it("follows the engine state and the review queue", () => {
    expect(adviceFor(undefined, false).action).toBe("start");
    expect(adviceFor("fractured", false).action).toBe("practise");
    expect(adviceFor("fragile", false).action).toBe("practise");
    expect(adviceFor("fluid", false).action).toBe("keep_fresh");
    for (const s of ["fractured", "fragile", "fluid"] as const) expect(adviceFor(s, true).action).toBe("revise"); // due for review wins
    expect(STATE_DESCRIPTION).toEqual({ fractured: "Needs practice", fragile: "Improving", fluid: "Mastered" });
  });
});

describe("the lesson page's progress panel", () => {
  function practised(skill: string, results: boolean[], lastAt: number): TechniqueState {
    let s = freshState(skill);
    results.forEach((c, i) => { s = processAttempt(s, { correct: c, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}${i}`, at: lastAt - (results.length - i) * 1000 }); });
    return s;
  }

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    apiGet.mockReset();
    await db.masteryHistory.clear();
  });
  afterEach(() => cleanup());

  async function open(states: Record<string, TechniqueState>, readable = true) {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/practice/mastery") {
        if (!readable) throw new Error("offline");
        return { technique_states: JSON.parse(JSON.stringify(states)), as_of: NOW - DAY };
      }
      if (path === "/practice/catalog") return { skills: Object.keys(states).map((skill) => ({ skill, parents: [], servable: 9 })) };
      throw new Error("unexpected " + path);
    });
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never, token: "t", isAuthenticated: true });
    const { TechniqueMasteryPanel } = await import("@/components/technique/technique-mastery-panel");
    return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TechniqueMasteryPanel skillId="Nikhilam" skillLabel="Nikhilam" /></QueryClientProvider>);
  }

  it("shows the engine label, the last practice, the recorded changes and a direct technique-only practice link", async () => {
    await recordMasteryHistory("u1", "s1", change([["Nikhilam", undefined, "fractured"]]), NOW - 5 * DAY);
    await recordMasteryHistory("u1", "s2", change([["Nikhilam", "fractured", "fragile"]]), NOW - 2 * DAY);
    await open({ Nikhilam: practised("Nikhilam", [true, true, true, true, true, true], NOW - 2 * DAY) });
    expect(await screen.findByTestId("technique-mastery-state")).toHaveTextContent("Improving"); // fragile
    expect(screen.getByTestId("mastery-state")).toHaveAttribute("data-state", "fragile");
    expect(screen.getByTestId("technique-last-practice")).toHaveTextContent("Last practised 2 days ago");
    await waitFor(() => expect(screen.getAllByRole("listitem").map((x) => x.textContent)).toEqual(["Fractured to Fragile2 days ago", "First practice: Fractured5 days ago"]));
    expect(screen.getByTestId("technique-advice")).toHaveTextContent("A few more correct answers");
    expect(screen.getByTestId("technique-mastery-practice")).toHaveAttribute("href", "/learn/practice?skill=Nikhilam&start=1");
  });

  it("says nothing was recorded rather than inventing a past", async () => {
    await open({ Nikhilam: practised("Nikhilam", Array(30).fill(true), NOW - DAY) });
    expect(await screen.findByTestId("technique-history-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("technique-history")).not.toBeInTheDocument();
    expect(screen.getByTestId("technique-mastery-state")).toHaveTextContent("Mastered");
  });

  it("a technique due for revision is offered as a revision", async () => {
    await open({ Nikhilam: practised("Nikhilam", Array(30).fill(true), NOW - 12 * DAY) }); // idle past the 7-day cliff
    expect(await screen.findByTestId("technique-advice")).toHaveTextContent("due for revision");
    expect(screen.getByTestId("technique-mastery-practice")).toHaveTextContent("Revise now");
  });

  it("is absent when the learner's history cannot be read", async () => {
    await open({}, false);
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/practice/mastery"));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("technique-mastery")).not.toBeInTheDocument();
  });

  it("a technique the learner has not practised reads as not started", async () => {
    await open({ Other: practised("Other", [true, true, true, true, true, true], NOW - DAY) });
    expect(await screen.findByTestId("technique-mastery-state")).toHaveTextContent("Not started");
    expect(screen.getByTestId("technique-mastery-practice")).toHaveTextContent("Start");
  });
});

