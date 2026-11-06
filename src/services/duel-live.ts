import { io as defaultIo, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/platform";

/**
 * Live duels over Socket.IO (staging: /lobby for matchmaking, /game for the match). The shapes below were read from a real match
 * between two accounts on staging (2026-11-06); anything else the server adds is ignored, never required.
 *
 *   /lobby  emit  join_lobby { mode }            -> ack { status: "waiting", estimated_wait_seconds }
 *           on    match_found { match_id, mode, topology, opponents: [{ user_id, theta_u, opponent_kind }] }
 *                 (opponents lists EVERY player, the learner included, and carries no names)
 *   /game   emit  game:join { match_id }         -> ack { status: "joined" }
 *           on    round_started { match_id, round_number, active_user_id, problem { problem_id, problem_text, difficulty, time_limit_ms } }
 *           emit  submit_game_answer { match_id, problem_id, answer, keystroke_intervals_ms } -> ack { correct }
 *           on    round_ended { problem_id, user_id, correct, points_earned (may be negative), correct_answer }
 *           on    match_ended { match_id, rankings: [{ user_id, rank, score, accuracy, avg_time }], elimination_reason, rated,
 *                               elo_updates: [{ user_id, elo_before, elo_after, elo_change, rating_deviation }] }
 */

export const DUEL_MODE = "accuracy_duel";
/** Well inside the server's 10 s silence limit, so one missed beat does not start a forfeit. */
export const HEARTBEAT_EVERY_MS = 4000;

export type DuelProblem = { problem_id: string; problem_text?: string; question_text?: string; difficulty?: number; time_limit_ms: number };
/** The question to show: the server's `problem_text` (an older name, `question_text`, is accepted too). */
export const questionOf = (p: DuelProblem): string => p.problem_text ?? p.question_text ?? "";
export type DuelRound = { round_number: number; active_user_id: string; problem: DuelProblem };
/** user_id is whoever answered the round. */
export type DuelRoundEnd = { problem_id: string; user_id?: string; correct: boolean; points_earned: number; correct_answer?: string | number };
export type DuelPlayer = { user_id: string; theta_u?: number; opponent_kind?: string };
export type DuelMatchFound = { match_id: string; mode: string; opponents: DuelPlayer[]; topology?: string };
export type DuelRanking = { user_id: string; rank?: number; score?: number; accuracy?: number; avg_time?: number };
export type DuelEloUpdate = { user_id: string; elo_before: number; elo_after: number; elo_change: number; rating_deviation?: number };
export type DuelMatchEnd = { match_id: string; rankings: DuelRanking[]; elimination_reason?: string | null; rated?: boolean; elo_updates?: DuelEloUpdate[] };

export type DuelHandlers = {
  /** In the queue; the server's estimate of the wait, when it gives one. */
  onQueued?: (estimatedWaitSeconds: number | null) => void;
  onMatchFound: (m: DuelMatchFound) => void;
  onRoundStarted: (r: DuelRound) => void;
  /** The match was (re)joined. After a reconnect the server does not replay the current round, so this is what ends "reconnecting". */
  onJoined?: () => void;
  /** Another player lost their connection; they have this long to come back before forfeiting. */
  onOpponentAway?: (userId: string, graceSeconds: number) => void;
  onRoundEnded: (r: DuelRoundEnd) => void;
  onMatchEnded: (m: DuelMatchEnd) => void;
  /** A connection or server problem the learner should be told about. */
  onError: (message: string) => void;
  /** The game socket dropped and is trying again (socket.io reconnects by itself and re-joins the match). */
  onReconnecting?: () => void;
};

export type IoFactory = (url: string, opts: Record<string, unknown>) => Socket;

/** socket.io's own wording for "the connection itself failed", as opposed to the server refusing us. */
const TRANSPORT_ERRORS = /^(websocket error|xhr poll error|transport (error|close)|timeout|server error|poll error)$/i;
export const UNREACHABLE = "Couldn't reach the duel server. Check your connection, and turn off any VPN or ad blocker for this site, then try again.";

/** The server's reason when it refuses; a connection failure becomes a plain sentence rather than "websocket error". */
function messageOf(err: unknown, fallback: string): string {
  const m = (err as { message?: unknown } | null)?.message;
  if (typeof m !== "string" || !m.trim()) return fallback;
  return TRANSPORT_ERRORS.test(m.trim()) ? UNREACHABLE : m;
}
const isTransportFailure = (err: unknown) => messageOf(err, "") === UNREACHABLE;

/**
 * The server refuses a game event with `{ code }` in the ack (duel-room.ts), not with an error: NOT_A_PLAYER (game:join), and for
 * submit_game_answer MATCH_NOT_FOUND, MATCH_OVER, NO_PROBLEM_IN_PLAY, STALE_PROBLEM, NOT_YOUR_TURN, SUB_200MS, MISSING_KEYSTROKES.
 * A refused answer leaves the round open and the timer running, so these are shown, not treated as a wrong answer.
 */
const CODE_MESSAGES: Record<string, string> = {
  NOT_A_PLAYER: "You aren't a player in this match.",
  MATCH_NOT_FOUND: "This match has ended.",
  MATCH_OVER: "This match has ended.",
  NO_PROBLEM_IN_PLAY: "The next question isn't ready yet. Try again in a moment.",
  STALE_PROBLEM: "That question has already moved on.",
  NOT_YOUR_TURN: "It isn't your turn.",
  SUB_200MS: "That was sent too fast to be typed. Enter the answer and try again.",
  MISSING_KEYSTROKES: "Type your answer rather than pasting it.",
};

function isAckError(ack: unknown): string | null {
  const a = ack as { error?: unknown; ok?: unknown; status?: unknown; code?: unknown } | null | undefined;
  if (a && typeof a.code === "string" && a.code) return CODE_MESSAGES[a.code] ?? "The server refused the request.";
  if (a && typeof a.error === "string" && a.error) return a.error;
  if (a && a.status === "unavailable") return "Duels aren't available right now. Please try again later.";
  if (a && (a.ok === false || a.status === "error")) return "The server refused the request.";
  return null;
}

export class DuelClient {
  private lobby: Socket | null = null;
  private game: Socket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(
    private readonly token: string,
    private readonly handlers: DuelHandlers,
    private readonly io: IoFactory = defaultIo as unknown as IoFactory,
    private readonly baseUrl: string = API_BASE_URL,
  ) {}

  /**
   * The lobby fails fast (one attempt, the learner taps Try again) so a blocked connection is reported instead of retried forever.
   * The match keeps trying for a short while, because a dropped connection mid-match usually comes back.
   */
  private connect(namespace: "lobby" | "game"): Socket {
    const retry = namespace === "game" ? { reconnection: true, reconnectionAttempts: 5 } : { reconnection: false };
    return this.io(`${this.baseUrl}/${namespace}`, { auth: { token: this.token }, transports: ["websocket"], ...retry });
  }

  /** Join the matchmaking queue. The match_found listener is attached first so a fast match cannot be missed. */
  findMatch(mode: string = DUEL_MODE): void {
    this.leaveLobby();
    const socket = this.connect("lobby");
    this.lobby = socket;
    socket.once("match_found", (m: DuelMatchFound) => {
      this.leaveLobby();
      if (!this.closed) this.handlers.onMatchFound(m);
    });
    socket.on("connect_error", (err: Error) => {
      if (this.lobby === socket) this.handlers.onError(messageOf(err, "Couldn't reach the matchmaking server."));
    });
    socket.on("connect", () => {
      void socket.emitWithAck("join_lobby", { mode }).then(
        (ack: unknown) => {
          const bad = isAckError(ack);
          if (bad && this.lobby === socket) this.handlers.onError(bad);
          else if (this.lobby === socket) {
            const w = (ack as { estimated_wait_seconds?: unknown } | null)?.estimated_wait_seconds;
            this.handlers.onQueued?.(typeof w === "number" && Number.isFinite(w) ? w : null);
          }
        },
        (err: unknown) => {
          if (this.lobby === socket) this.handlers.onError(messageOf(err, "Couldn't join the queue."));
        },
      );
    });
  }

  /** Leave the queue. Closing the lobby connection is how a player drops out of matchmaking. */
  cancelSearch(): void {
    this.leaveLobby();
  }

  private leaveLobby(): void {
    if (!this.lobby) return;
    this.lobby.removeAllListeners();
    this.lobby.disconnect();
    this.lobby = null;
  }

  /** Enter the live match. Listeners first, then join; on every (re)connect the match is joined again. */
  joinMatch(matchId: string): void {
    this.leaveGame();
    const socket = this.connect("game");
    this.game = socket;
    socket.on("round_started", (r: DuelRound) => this.handlers.onRoundStarted(r));
    socket.on("round_ended", (r: DuelRoundEnd) => this.handlers.onRoundEnded(r));
    socket.on("game:player_disconnected", (e: { user_id?: unknown; grace_period_seconds?: unknown }) => {
      if (typeof e?.user_id === "string") this.handlers.onOpponentAway?.(e.user_id, typeof e.grace_period_seconds === "number" ? e.grace_period_seconds : 15);
    });
    socket.on("match_ended", (m: DuelMatchEnd) => {
      this.handlers.onMatchEnded(m);
      this.leaveGame();
    });
    socket.on("connect_error", (err: Error) => {
      if (this.game !== socket) return;
      // A dropped connection is retried by socket.io; only a refusal by the server is final here.
      if (isTransportFailure(err)) this.handlers.onReconnecting?.();
      else this.handlers.onError(messageOf(err, "Lost the connection to the match."));
    });
    socket.io?.on?.("reconnect_failed", () => {
      if (this.game === socket) this.handlers.onError(UNREACHABLE);
    });
    socket.on("disconnect", (reason: string) => {
      // "io client disconnect" is our own leaveGame(); anything else is a drop that socket.io retries.
      if (this.game === socket && reason !== "io client disconnect") {
        this.stopHeartbeat();
        this.handlers.onReconnecting?.();
      }
    });
    socket.on("connect", () => {
      this.startHeartbeat(socket);
      void socket.emitWithAck("game:join", { match_id: matchId }).then(
        (ack: unknown) => {
          const bad = isAckError(ack);
          if (bad && this.game === socket) this.handlers.onError(bad);
          else if (this.game === socket) this.handlers.onJoined?.();
        },
        (err: unknown) => {
          if (this.game === socket) this.handlers.onError(messageOf(err, "Couldn't join the match."));
        },
      );
    });
  }

  /**
   * The server treats silence longer than 10 s as a dropped connection (duel.ts HEARTBEAT_TIMEOUT_MS) and forfeits the match after a
   * further 15 s. A player thinking about a question sends nothing else, so the client says "still here" every few seconds.
   */
  private startHeartbeat(socket: Socket): void {
    this.stopHeartbeat();
    socket.emit("game:heartbeat");
    this.heartbeat = setInterval(() => {
      if (this.game === socket) socket.emit("game:heartbeat");
    }, HEARTBEAT_EVERY_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  /** Submit the answer for the current problem. Resolves to whether the server marked it correct. */
  async submitAnswer(matchId: string, problemId: string, answer: string, keystrokeIntervalsMs: number[]): Promise<boolean> {
    if (!this.game) throw new Error("Not connected to the match.");
    // No client_timestamp_ms on purpose: the server measures solve time as (that value - the moment it sent the problem), on ITS clock,
    // so a phone whose clock runs behind would have every answer refused as SUB_200MS. Left out, the server uses its own receipt time.
    const ack = (await this.game.emitWithAck("submit_game_answer", {
      match_id: matchId,
      problem_id: problemId,
      answer,
      keystroke_intervals_ms: keystrokeIntervalsMs,
    })) as { correct?: unknown } | undefined;
    const bad = isAckError(ack);
    if (bad) throw new Error(bad);
    return ack?.correct === true;
  }

  private leaveGame(): void {
    this.stopHeartbeat();
    if (!this.game) return;
    this.game.removeAllListeners();
    this.game.disconnect();
    this.game = null;
  }

  /** Close everything (leaving the screen). Nothing further is reported. */
  close(): void {
    this.closed = true;
    this.leaveLobby();
    this.leaveGame();
  }
}
