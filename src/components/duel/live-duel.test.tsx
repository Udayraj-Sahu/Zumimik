import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { duelReducer, INITIAL_DUEL } from "@/hooks/use-live-duel";
import type { IoFactory } from "@/services/duel-live";

vi.setConfig({ testTimeout: 30000 });
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }), usePathname: () => "/play/duel", useSearchParams: () => new URLSearchParams() }));
const push = vi.fn();
const refresh = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), refreshAccessToken: (...a: unknown[]) => refresh(...a) }));

/** A socket.io client stand-in: records emits, lets the test fire server events. */
class FakeSocket {
  handlers = new Map<string, Array<(...a: unknown[]) => void>>();
  emits: Array<[string, unknown]> = [];
  disconnected = false;
  plainEmits: string[] = [];
  acks = new Map<string, unknown>();
  constructor(public url: string, public opts: Record<string, unknown>) {}
  on(ev: string, fn: (...a: unknown[]) => void) { this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]); return this; }
  once(ev: string, fn: (...a: unknown[]) => void) {
    const wrapped = (...a: unknown[]) => { this.off(ev, wrapped); fn(...a); };
    return this.on(ev, wrapped);
  }
  off(ev: string, fn: (...a: unknown[]) => void) { this.handlers.set(ev, (this.handlers.get(ev) ?? []).filter((h) => h !== fn)); return this; }
  removeAllListeners() { this.handlers.clear(); return this; }
  disconnect() { this.disconnected = true; return this; }
  emit(ev: string) { this.plainEmits.push(ev); return this; }
  async emitWithAck(ev: string, payload: unknown) {
    this.emits.push([ev, payload]);
    const a = this.acks.get(ev);
    if (a instanceof Error) throw a;
    return a ?? {};
  }
  fire(ev: string, ...a: unknown[]) { act(() => { for (const h of [...(this.handlers.get(ev) ?? [])]) h(...a); }); }
}

let sockets: FakeSocket[] = [];
const io: IoFactory = (url, opts) => { const s = new FakeSocket(url, opts); sockets.push(s); return s as never; };
const socketFor = (ns: string) => sockets.filter((s) => s.url.endsWith(`/${ns}`)).at(-1)!;

// Shapes captured from a real two-account match on staging (2026-11-06).
const ROUND = { match_id: "ad_1", round_number: 1, active_user_id: "me", problem: { problem_id: "p1", problem_text: "What is 7 × 8?", difficulty: 2, time_limit_ms: 45000 } };
const FOUND = { match_id: "ad_1", mode: "accuracy_duel", topology: "online", opponents: [{ user_id: "me", theta_u: 0, opponent_kind: "human" }, { user_id: "other", theta_u: 0, opponent_kind: "human" }] };
const ENDED = {
  match_id: "ad_1", elimination_reason: "wrong_answer", rated: true,
  rankings: [{ user_id: "me", rank: 2, score: 0, accuracy: 0, avg_time: 997 }, { user_id: "other", rank: 1, score: 2, accuracy: 0, avg_time: 0 }],
  elo_updates: [{ user_id: "me", elo_before: 1000, elo_after: 837, elo_change: -163, rating_deviation: 290 }, { user_id: "other", elo_before: 1000, elo_after: 1162, elo_change: 162, rating_deviation: 290 }],
};

async function mount() {
  const { LiveDuel } = await import("./live-duel");
  return render(<LiveDuel io={io} />);
}

describe("the duel reducer", () => {
  it("walks search -> found -> round -> round end -> match end", () => {
    let s = duelReducer(INITIAL_DUEL, { type: "search" });
    expect(s.phase).toBe("searching");
    s = duelReducer(s, { type: "found", match: FOUND, selfId: "me" });
    expect(s).toMatchObject({ phase: "joining", matchId: "ad_1" });
    expect(s.opponents.map((o) => o.user_id)).toEqual(["other"]); // the server lists the learner too
    s = duelReducer(s, { type: "round", round: ROUND, at: 5 });
    expect(s).toMatchObject({ phase: "playing", answered: false, verdict: null });
    s = duelReducer(s, { type: "roundEnd", end: { problem_id: "p1", user_id: "me", correct: true, points_earned: 10 }, mine: true });
    s = duelReducer(s, { type: "roundEnd", end: { problem_id: "p2", user_id: "other", correct: true, points_earned: 7 }, mine: false });
    s = duelReducer(s, { type: "roundEnd", end: { problem_id: "p3", user_id: "me", correct: false, points_earned: -1 }, mine: true });
    expect(s.points).toBe(9); // only the learner's own rounds count, and a penalty subtracts
    s = duelReducer(s, { type: "matchEnd", end: ENDED });
    expect(s.phase).toBe("ended");
    // a late error does not replace the results
    expect(duelReducer(s, { type: "error", message: "x" }).phase).toBe("ended");
  });

  it("a failed answer keeps the match going and lets the learner try again", () => {
    let s = duelReducer(INITIAL_DUEL, { type: "round", round: ROUND, at: 1 });
    s = duelReducer(s, { type: "submitted" });
    s = duelReducer(s, { type: "submitFailed", message: "offline" });
    expect(s).toMatchObject({ phase: "playing", answered: false, error: "offline" });
  });
});

describe("a live duel", () => {
  beforeEach(() => {
    sockets = [];
    push.mockClear();
    useAuthStore.setState({ user: { id: "me", name: "A", email: "a@x.com", role: "user" } as never, token: "jwt-1", isAuthenticated: true });
  });
  afterEach(() => cleanup());

  it("queues on /lobby with the token, then plays the match on /game", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    expect(screen.getByTestId("duel-searching")).toBeInTheDocument();

    const lobby = socketFor("lobby");
    expect(lobby.opts).toMatchObject({ auth: { token: "jwt-1" }, transports: ["websocket"] });
    lobby.acks.set("join_lobby", { status: "waiting", estimated_wait_seconds: 60 });
    lobby.fire("connect");
    await waitFor(() => expect(lobby.emits).toContainEqual(["join_lobby", { mode: "accuracy_duel" }]));
    expect(await screen.findByTestId("duel-wait")).toHaveTextContent("about 1 min");

    lobby.fire("match_found", FOUND);
    expect(lobby.disconnected).toBe(true); // the lobby is left once matched
    expect(screen.getByTestId("duel-opponents")).toHaveTextContent("vs another player");

    const game = socketFor("game");
    game.fire("connect");
    await waitFor(() => expect(game.emits).toContainEqual(["game:join", { match_id: "ad_1" }]));

    game.fire("round_started", ROUND);
    expect(screen.getByTestId("duel-question")).toHaveTextContent("What is 7 × 8?");
    expect(screen.getByTestId("duel-turn")).toHaveTextContent("Your turn");

    game.acks.set("submit_game_answer", { correct: true });
    const input = screen.getByLabelText("Your answer");
    fireEvent.keyDown(input, { key: "5" });
    fireEvent.change(input, { target: { value: "56" } });
    fireEvent.keyDown(input, { key: "6" });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(screen.getByTestId("duel-verdict")).toHaveTextContent("Correct"));
    const sent = game.emits.find(([e]) => e === "submit_game_answer")![1] as { match_id: string; problem_id: string; answer: string; keystroke_intervals_ms: number[] };
    expect(sent).toMatchObject({ match_id: "ad_1", problem_id: "p1", answer: "56" });
    expect(sent.keystroke_intervals_ms).toHaveLength(1);

    game.fire("round_ended", { problem_id: "p1", user_id: "me", correct: false, points_earned: -1, correct_answer: "0.4" });
    expect(screen.getByTestId("duel-round-end")).toHaveTextContent("Answer: 0.4");
    expect(screen.getByTestId("duel-round-end")).toHaveTextContent("-1 points");
    expect(screen.getByTestId("duel-points")).toHaveTextContent("Points: -1");

    game.fire("match_ended", ENDED);
    expect(screen.getByTestId("duel-outcome")).toHaveTextContent("You lost");
    expect(screen.getByTestId("duel-reason")).toHaveTextContent("wrong answer");
    expect(screen.getByTestId("duel-elo")).toHaveTextContent("1000 → 837 (-163)");
    const rows = screen.getByTestId("duel-rankings").querySelectorAll("li");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Opponent"); // sorted by rank: the winner first
    expect(rows[1]).toHaveTextContent("You");
    expect(game.disconnected).toBe(true);
  });

  it("shows a win with the rating gained, and tells whose answer a round was", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    game.fire("round_started", { ...ROUND, active_user_id: "other" });
    game.fire("round_ended", { problem_id: "p1", user_id: "other", correct: false, points_earned: -1, correct_answer: "0.4" });
    expect(screen.getByTestId("duel-round-end")).toHaveTextContent("Your opponent got it wrong");
    expect(screen.getByTestId("duel-points")).toHaveTextContent("Points: 0"); // the opponent's round is not the learner's points
    game.fire("match_ended", { ...ENDED, rankings: [{ user_id: "me", rank: 1, score: 2 }, { user_id: "other", rank: 2, score: 0 }], elo_updates: [{ user_id: "me", elo_before: 1000, elo_after: 1162, elo_change: 162 }] });
    expect(screen.getByTestId("duel-outcome")).toHaveTextContent("You won");
    expect(screen.getByTestId("duel-elo")).toHaveTextContent("1000 → 1162 (+162)");
  });

  it("on the opponent's turn there is no answer box", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    socketFor("game").fire("round_started", { ...ROUND, active_user_id: "someone-else" });
    expect(screen.getByTestId("duel-turn")).toHaveTextContent("Opponent's turn");
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    expect(screen.getByTestId("duel-waiting")).toBeInTheDocument();
  });

  it("Cancel leaves the queue by closing the lobby connection", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    const lobby = socketFor("lobby");
    fireEvent.click(screen.getByTestId("duel-cancel"));
    expect(lobby.disconnected).toBe(true);
    expect(screen.getByTestId("duel-find")).toBeInTheDocument();
  });

  it("says why when the server refuses the queue or cannot be reached", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("connect_error", new Error("Authentication failed"));
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("Authentication failed");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByTestId("duel-find")).toBeInTheDocument();
  });

  it("an expired token is renewed once and the queue is joined again with the new one", async () => {
    refresh.mockImplementation(async () => { useAuthStore.setState({ token: "jwt-2" }); return "jwt-2"; });
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("connect_error", new Error("AUTH_EXPIRED"));
    await waitFor(() => expect(sockets.filter((x) => x.url.endsWith("/lobby"))).toHaveLength(2));
    expect(socketFor("lobby").opts).toMatchObject({ auth: { token: "jwt-2" } });
    expect(screen.getByTestId("duel-searching")).toBeInTheDocument();
    // a second refusal is not retried again
    refresh.mockClear();
    socketFor("lobby").fire("connect_error", new Error("AUTH_EXPIRED"));
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("session expired");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says the session expired when the token cannot be renewed", async () => {
    refresh.mockResolvedValue(null);
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("connect_error", new Error("AUTH_EXPIRED"));
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("Your session expired");
  });

  it("a blocked connection says so in plain words and stops retrying", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    const lobby = socketFor("lobby");
    expect(lobby.opts).toMatchObject({ reconnection: false });
    lobby.fire("connect_error", new Error("websocket error"));
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("Couldn't reach the duel server");
    expect(screen.getByTestId("duel-error")).toHaveTextContent("VPN or ad blocker");
    expect(lobby.disconnected).toBe(true);
  });

  it("a connection failure mid-match is a reconnect, not the end of the match", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    expect(game.opts).toMatchObject({ reconnection: true, reconnectionAttempts: 5 });
    game.fire("round_started", ROUND);
    game.fire("connect_error", new Error("websocket error"));
    expect(screen.getByTestId("duel-reconnecting")).toBeInTheDocument();
    expect(screen.getByTestId("duel-round")).toBeInTheDocument();
    expect(screen.queryByTestId("duel-error")).not.toBeInTheDocument();
  });

  it("an unavailable queue is reported instead of searching forever", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    const lobby = socketFor("lobby");
    lobby.acks.set("join_lobby", { status: "unavailable" });
    lobby.fire("connect");
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("aren't available right now");
  });

  it("after a reconnect the server replays nothing: re-joining clears the note, and an opponent's drop is shown", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    game.fire("round_started", ROUND);
    game.fire("disconnect", "transport close");
    expect(screen.getByTestId("duel-reconnecting")).toBeInTheDocument();
    game.fire("connect"); // socket.io reconnected: the match is joined again
    await waitFor(() => expect(screen.queryByTestId("duel-reconnecting")).not.toBeInTheDocument());
    expect(screen.getByTestId("duel-round")).toBeInTheDocument();

    game.fire("game:player_disconnected", { user_id: "me", grace_period_seconds: 15 });
    expect(screen.queryByTestId("duel-away")).not.toBeInTheDocument(); // the learner's own drop is not "the opponent's"
    game.fire("game:player_disconnected", { user_id: "other", grace_period_seconds: 15 });
    expect(screen.getByTestId("duel-away")).toHaveTextContent("15 seconds");
    game.fire("match_ended", { ...ENDED, elimination_reason: "forfeit" });
    expect(screen.queryByTestId("duel-away")).not.toBeInTheDocument();
    expect(screen.getByTestId("duel-reason")).toHaveTextContent("lost the connection"); // the loser in ENDED is the learner
  });

  it("sends a heartbeat every few seconds while in a match, because the server forfeits a silent player after 10 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await mount();
      fireEvent.click(screen.getByTestId("duel-find"));
      socketFor("lobby").fire("match_found", FOUND);
      const game = socketFor("game");
      game.fire("connect");
      expect(game.plainEmits.filter((e) => e === "game:heartbeat")).toHaveLength(1); // immediately on joining
      act(() => { vi.advanceTimersByTime(12_000); });
      expect(game.plainEmits.filter((e) => e === "game:heartbeat").length).toBeGreaterThanOrEqual(3); // 0, 4, 8, 12 s
      game.fire("disconnect", "transport close");
      const before = game.plainEmits.length;
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(game.plainEmits.length).toBe(before); // none while the connection is down
      game.fire("match_ended", ENDED);
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(game.plainEmits.length).toBe(before); // none after the match
    } finally {
      vi.useRealTimers();
    }
  });

  it("the server's { code } refusals are shown, not read as a wrong answer or as joined", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    game.acks.set("game:join", { code: "NOT_A_PLAYER" });
    game.fire("connect");
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("aren't a player");
    cleanup();
    sockets = [];
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const g2 = socketFor("game");
    g2.fire("round_started", ROUND);
    for (const [code, text] of [["MISSING_KEYSTROKES", "pasting"], ["NOT_YOUR_TURN", "isn't your turn"], ["STALE_PROBLEM", "moved on"]] as const) {
      g2.acks.set("submit_game_answer", { code });
      fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "56" } });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));
      expect(await screen.findByTestId("duel-send-error")).toHaveTextContent(text);
      expect(screen.queryByTestId("duel-verdict")).not.toBeInTheDocument(); // never shown as "Not quite"
    }
    const sent = g2.emits.filter(([e]) => e === "submit_game_answer").at(-1)![1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("client_timestamp_ms"); // the server's clock decides solve time; a skewed phone clock must not matter
  });

  it("a refused answer keeps the match open and says so", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    game.fire("round_started", ROUND);
    game.acks.set("submit_game_answer", new Error("Not your turn"));
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByTestId("duel-send-error")).toHaveTextContent("Not your turn");
    expect(screen.getByTestId("duel-round")).toBeInTheDocument();
  });

  it("shows a reconnecting note when the match connection drops", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    socketFor("lobby").fire("match_found", FOUND);
    const game = socketFor("game");
    game.fire("round_started", ROUND);
    game.fire("disconnect", "transport close");
    expect(screen.getByTestId("duel-reconnecting")).toBeInTheDocument();
    game.fire("round_started", ROUND); // the server replays the round after re-joining
    expect(screen.queryByTestId("duel-reconnecting")).not.toBeInTheDocument();
  });

  it("needs a signed-in learner", async () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as never);
    await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    expect(await screen.findByTestId("duel-error")).toHaveTextContent("Sign in");
    expect(sockets).toHaveLength(0);
  });

  it("closes the sockets when the screen is left", async () => {
    const view = await mount();
    fireEvent.click(screen.getByTestId("duel-find"));
    const lobby = socketFor("lobby");
    view.unmount();
    expect(lobby.disconnected).toBe(true);
  });
});
