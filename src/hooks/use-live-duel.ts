"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { refreshAccessToken } from "@/services/api";
import { DuelClient, type DuelPlayer, type DuelMatchEnd, type DuelMatchFound, type DuelRound, type DuelRoundEnd, type IoFactory } from "@/services/duel-live";

export type LiveDuelPhase = "idle" | "searching" | "joining" | "playing" | "ended" | "error";

export type LiveDuelState = {
  phase: LiveDuelPhase;
  matchId: string | null;
  /** The other players in the match (the server lists everyone, the learner included). */
  opponents: DuelPlayer[];
  estimatedWait: number | null;
  round: DuelRound | null;
  /** When this device received the round, for the countdown (the server sends only the time limit). */
  roundReceivedAt: number | null;
  /** This device has sent its answer for the current problem. */
  answered: boolean;
  /** The server's verdict on this device's answer, once it has replied. */
  verdict: boolean | null;
  roundEnd: DuelRoundEnd | null;
  /** Points reported by round_ended, added up over the match. */
  points: number;
  end: DuelMatchEnd | null;
  error: string | null;
  reconnecting: boolean;
  /** Seconds another player has to come back after losing their connection, while that is true. */
  opponentAway: number | null;
};

export const INITIAL_DUEL: LiveDuelState = {
  phase: "idle", matchId: null, opponents: [], estimatedWait: null, round: null, roundReceivedAt: null, answered: false, verdict: null,
  roundEnd: null, points: 0, end: null, error: null, reconnecting: false, opponentAway: null,
};

export type DuelAction =
  | { type: "search" }
  | { type: "cancel" }
  | { type: "queued"; wait: number | null }
  | { type: "found"; match: DuelMatchFound; selfId: string | null }
  | { type: "round"; round: DuelRound; at: number }
  | { type: "submitted" }
  | { type: "verdict"; correct: boolean }
  | { type: "submitFailed"; message: string }
  | { type: "roundEnd"; end: DuelRoundEnd; mine: boolean }
  | { type: "matchEnd"; end: DuelMatchEnd }
  | { type: "reconnecting" }
  | { type: "joined" }
  | { type: "away"; graceSeconds: number }
  | { type: "back" }
  | { type: "error"; message: string }
  | { type: "reset" };

export function duelReducer(s: LiveDuelState, a: DuelAction): LiveDuelState {
  switch (a.type) {
    case "search":
      return { ...INITIAL_DUEL, phase: "searching" };
    case "cancel":
    case "reset":
      return INITIAL_DUEL;
    case "queued":
      return s.phase === "searching" ? { ...s, estimatedWait: a.wait } : s;
    case "found":
      return { ...s, phase: "joining", matchId: a.match.match_id, opponents: (a.match.opponents ?? []).filter((o) => o?.user_id !== a.selfId), error: null };
    case "round":
      // A round restarts the per-problem state; a reconnect that replays the current round does too, which is harmless.
      return { ...s, phase: "playing", round: a.round, roundReceivedAt: a.at, answered: false, verdict: null, roundEnd: null, reconnecting: false, opponentAway: null, error: null };
    case "submitted":
      return { ...s, answered: true };
    case "verdict":
      return { ...s, verdict: a.correct };
    case "submitFailed":
      // The answer did not go through: the match goes on and the learner can try again.
      return { ...s, answered: false, error: a.message };
    case "roundEnd":
      // The server reports every player's rounds; only this learner's points are added to their total.
      return { ...s, roundEnd: a.end, points: a.mine && Number.isFinite(a.end.points_earned) ? s.points + a.end.points_earned : s.points };
    case "matchEnd":
      return { ...s, phase: "ended", end: a.end, reconnecting: false, opponentAway: null };
    case "joined":
      return s.reconnecting ? { ...s, reconnecting: false } : s;
    case "away":
      return s.phase === "playing" || s.phase === "joining" ? { ...s, opponentAway: a.graceSeconds } : s;
    case "back":
      return s.opponentAway === null ? s : { ...s, opponentAway: null };
    case "reconnecting":
      return s.phase === "playing" || s.phase === "joining" ? { ...s, reconnecting: true } : s;
    case "error":
      // A failure after the match is over must not replace the results.
      return s.phase === "ended" ? s : { ...s, phase: "error", error: a.message };
  }
}

/** The state of one live duel and the actions that drive it. The sockets are closed when the screen is left. */
export function useLiveDuel(io?: IoFactory) {
  const [state, dispatch] = useReducer(duelReducer, INITIAL_DUEL);
  const client = useRef<DuelClient | null>(null);
  const matchId = useRef<string | null>(null);
  const awayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  matchId.current = state.matchId;

  const close = useCallback(() => {
    if (awayTimer.current) clearTimeout(awayTimer.current);
    client.current?.close();
    client.current = null;
  }, []);
  useEffect(() => close, [close]);

  const find = useCallback((retried = false) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      dispatch({ type: "error", message: "Sign in to play a duel." });
      return;
    }
    close();
    dispatch({ type: "search" });
    const c = new DuelClient(token, {
      onQueued: (wait) => dispatch({ type: "queued", wait }),
      onMatchFound: (m) => {
        dispatch({ type: "found", match: m, selfId: useAuthStore.getState().user?.id ?? null });
        c.joinMatch(m.match_id);
      },
      onRoundStarted: (round) => dispatch({ type: "round", round, at: Date.now() }),
      onRoundEnded: (end) => dispatch({ type: "roundEnd", end, mine: end.user_id === undefined || end.user_id === useAuthStore.getState().user?.id }),
      onMatchEnded: (end) => dispatch({ type: "matchEnd", end }),
      onError: (message) => {
        // The sockets reject an expired access token with AUTH_EXPIRED: renew it once, the same way requests do, and queue again.
        if (message === "AUTH_EXPIRED") {
          if (client.current !== c) return;
          void (async () => {
            const fresh = retried ? null : await refreshAccessToken().catch(() => null);
            if (client.current !== c) return;
            if (fresh) find(true);
            else dispatch({ type: "error", message: "Your session expired. Sign in again to play." });
          })();
          return;
        }
        dispatch({ type: "error", message });
        close(); // a refused or unreachable connection is final: nothing keeps retrying behind the error
      },
      onReconnecting: () => dispatch({ type: "reconnecting" }),
      onJoined: () => dispatch({ type: "joined" }),
      onOpponentAway: (userId, graceSeconds) => {
        if (userId === useAuthStore.getState().user?.id) return; // that is this device's own drop
        dispatch({ type: "away", graceSeconds });
        if (awayTimer.current) clearTimeout(awayTimer.current);
        awayTimer.current = setTimeout(() => dispatch({ type: "back" }), graceSeconds * 1000);
      },
    }, io);
    client.current = c;
    c.findMatch();
  }, [close, io]);

  const cancel = useCallback(() => {
    close();
    dispatch({ type: "cancel" });
  }, [close]);

  const submit = useCallback(async (problemId: string, answer: string, keystrokeIntervalsMs: number[]) => {
    const id = matchId.current;
    if (!client.current || !id) return;
    dispatch({ type: "submitted" });
    try {
      const correct = await client.current.submitAnswer(id, problemId, answer, keystrokeIntervalsMs);
      dispatch({ type: "verdict", correct });
    } catch (e) {
      dispatch({ type: "submitFailed", message: e instanceof Error ? e.message : "Couldn't send your answer." });
    }
  }, []);

  const reset = useCallback(() => {
    close();
    dispatch({ type: "reset" });
  }, [close]);

  return { state, find, cancel, submit, reset, userId: useAuthStore((s) => s.user?.id ?? null) };
}
