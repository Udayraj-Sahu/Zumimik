"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Swords, Trophy, X } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useLiveDuel, type LiveDuelState } from "@/hooks/use-live-duel";
import { questionOf, type DuelMatchEnd, type DuelPlayer, type IoFactory } from "@/services/duel-live";

/** Who the learner plays: the server sends no names, only an id and a kind (human or bot). */
function opponentLabel(players: DuelPlayer[]): string {
  if (players.length === 0) return "";
  const bots = players.filter((o) => o.opponent_kind === "bot").length;
  if (players.length === 1) return bots === 1 ? "a bot" : "another player";
  return `${players.length} players${bots > 0 ? ` (${bots} bot${bots === 1 ? "" : "s"})` : ""}`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function Countdown({ limitMs, since, active }: { limitMs: number; since: number; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active, since]);
  const left = Math.max(0, limitMs - (now - since));
  const pct = limitMs > 0 ? Math.min(100, (left / limitMs) * 100) : 0;
  return (
    <div data-testid="duel-timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-right text-[11px] font-mono text-muted-foreground/60">{Math.ceil(left / 1000)}s</p>
    </div>
  );
}

function Question({ state, userId, onSubmit }: { state: LiveDuelState; userId: string | null; onSubmit: (problemId: string, answer: string, intervals: number[]) => void }) {
  const round = state.round!;
  const myTurn = !!userId && round.active_user_id === userId;
  const [answer, setAnswer] = useState("");
  const lastKey = useRef<number | null>(null);
  const intervals = useRef<number[]>([]);
  useEffect(() => {
    setAnswer("");
    lastKey.current = null;
    intervals.current = [];
  }, [round.problem.problem_id, round.round_number]);

  const over = state.roundEnd !== null;
  const canAnswer = myTurn && !state.answered && !over;
  return (
    <GlassCard className="p-5" data-testid="duel-round">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
        <span>Round {round.round_number}</span>
        <span data-testid="duel-turn" className={myTurn ? "text-primary" : undefined}>{myTurn ? "Your turn" : "Opponent's turn"}</span>
      </div>
      <div className="mt-3">
        <Countdown limitMs={round.problem.time_limit_ms} since={state.roundReceivedAt ?? Date.now()} active={!over} />
      </div>
      <p data-testid="duel-question" className="mt-4 whitespace-pre-wrap text-[16px] font-semibold leading-snug text-foreground">{questionOf(round.problem)}</p>

      {canAnswer || state.answered ? (
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canAnswer || !answer.trim()) return;
            onSubmit(round.problem.problem_id, answer.trim(), intervals.current);
          }}
        >
          <input
            aria-label="Your answer"
            value={answer}
            disabled={!canAnswer}
            autoFocus
            inputMode="text"
            autoComplete="off"
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={() => {
              const t = performance.now();
              if (lastKey.current !== null) intervals.current.push(Math.round(t - lastKey.current));
              lastKey.current = t;
            }}
            className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button type="submit" disabled={!canAnswer || !answer.trim()}>
            {state.answered && !over ? <Loader2 size={16} className="animate-spin" /> : "Submit"}
          </Button>
        </form>
      ) : (
        !over && <p className="mt-5 text-center text-[13px] text-muted-foreground/60" data-testid="duel-waiting">Waiting for your opponent to answer…</p>
      )}

      {state.verdict !== null && !over && (
        <p data-testid="duel-verdict" className={`mt-3 flex items-center gap-1.5 text-[13px] font-semibold ${state.verdict ? "text-primary" : "text-destructive"}`}>
          {state.verdict ? <Check size={16} /> : <X size={16} />} {state.verdict ? "Correct" : "Not quite"}
        </p>
      )}
      {over && (
        <div data-testid="duel-round-end" className="mt-4 rounded-xl border border-white/[0.08] px-4 py-3 text-[13px]">
          <p className={`font-semibold ${state.roundEnd!.correct ? "text-primary" : "text-destructive"}`}>
            {state.roundEnd!.user_id && userId && state.roundEnd!.user_id !== userId ? (state.roundEnd!.correct ? "Your opponent got it right" : "Your opponent got it wrong") : state.roundEnd!.correct ? "Correct" : "Incorrect"}
          </p>
          {state.roundEnd!.correct_answer !== undefined && <p className="mt-0.5 text-muted-foreground/70">Answer: {String(state.roundEnd!.correct_answer)}</p>}
          <p className="mt-0.5 text-muted-foreground/70">{signed(state.roundEnd!.points_earned)} points</p>
        </div>
      )}
    </GlassCard>
  );
}

function Results({ end, userId, onAgain, onExit }: { end: DuelMatchEnd; userId: string | null; onAgain: () => void; onExit: () => void }) {
  const rankings = (Array.isArray(end.rankings) ? [...end.rankings] : []).sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99));
  const me = rankings.find((r) => r.user_id === userId);
  const won = me?.rank === 1;
  const elo = (end.elo_updates ?? []).find((u) => u.user_id === userId);
  const reason = end.elimination_reason ? String(end.elimination_reason).replace(/_/g, " ") : null;
  return (
    <GlassCard className="p-6 text-center" data-testid="duel-results">
      <Trophy size={28} className={`mx-auto ${won ? "text-primary" : "text-muted-foreground/50"}`} aria-hidden />
      <h2 data-testid="duel-outcome" className="mt-2 text-[18px] font-bold text-foreground">{me ? (won ? "You won" : "You lost") : "Match over"}</h2>
      {reason && <p className="mt-1 text-[12px] capitalize text-muted-foreground/60" data-testid="duel-reason">Ended on: {reason}</p>}
      {end.rated === false && <p className="mt-1 text-[12px] text-muted-foreground/60">Unrated match</p>}
      {elo && (
        <p className="mt-2 text-[13px] text-foreground/80" data-testid="duel-elo">
          Rating {elo.elo_before} → {elo.elo_after} <span className={elo.elo_change >= 0 ? "text-primary" : "text-destructive"}>({signed(elo.elo_change)})</span>
        </p>
      )}
      {rankings.length > 0 && (
        <ol className="mt-4 space-y-2 text-left" data-testid="duel-rankings">
          {rankings.map((r, i) => {
            const mine = !!userId && r.user_id === userId;
            return (
              <li key={r.user_id ?? i} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[13px] ${mine ? "border-primary/40 bg-primary/10" : "border-white/[0.08]"}`}>
                <span className="font-mono text-[11px] text-muted-foreground/60">{r.rank ?? i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{mine ? "You" : "Opponent"}</span>
                {typeof r.score === "number" && <span className="font-mono text-muted-foreground/70">{r.score}</span>}
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="glass" fullWidth onClick={onExit}>Back</Button>
        <Button fullWidth onClick={onAgain}>Play again</Button>
      </div>
    </GlassCard>
  );
}

/** Real-mode duel: matchmaking and the live match over the server's sockets. `io` is injectable for tests. */
export function LiveDuel({ io }: { io?: IoFactory } = {}) {
  usePageMeta("Duel — Zuzumik");
  const router = useRouter();
  const { state, find, cancel, submit, reset, userId } = useLiveDuel(io);

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-xl">
        <div className="text-center">
          <div className="pill mb-3 inline-flex items-center gap-2 px-4 py-1.5">
            <Swords size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">DUEL</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45">Compete head-to-head in real time</p>
        </div>

        <div className="mt-6" aria-live="polite">
          {state.reconnecting && <p role="status" data-testid="duel-reconnecting" className="mb-3 text-center text-[12px] text-muted-foreground/60">Connection lost. Reconnecting…</p>}
          {state.opponentAway !== null && <p role="status" data-testid="duel-away" className="mb-3 text-center text-[12px] text-muted-foreground/60">Your opponent lost their connection. They have {state.opponentAway} seconds to come back.</p>}

          {state.phase === "idle" && (
            <GlassCard className="p-6 text-center">
              <p className="text-[14px] text-foreground/80">Accuracy Duel: take turns answering. A wrong answer can end the match.</p>
              <Button className="mt-5" fullWidth size="lg" onClick={() => find()} data-testid="duel-find">Find a match</Button>
            </GlassCard>
          )}

          {state.phase === "searching" && (
            <GlassCard className="p-6 text-center" data-testid="duel-searching">
              <Loader2 size={26} className="mx-auto animate-spin text-primary" aria-hidden />
              <p className="mt-3 text-[14px] font-semibold text-foreground">Looking for an opponent…</p>
              {state.estimatedWait !== null && <p className="mt-1 text-[12px] text-muted-foreground/60" data-testid="duel-wait">Estimated wait about {Math.max(1, Math.round(state.estimatedWait / 60))} min. It can take longer when few players are online.</p>}
              <Button className="mt-5" variant="glass" fullWidth onClick={cancel} data-testid="duel-cancel">Cancel</Button>
            </GlassCard>
          )}

          {state.phase === "joining" && (
            <GlassCard className="p-6 text-center" data-testid="duel-joining">
              <Loader2 size={26} className="mx-auto animate-spin text-primary" aria-hidden />
              <p className="mt-3 text-[14px] font-semibold text-foreground">Match found. Getting ready…</p>
              {state.opponents.length > 0 && <p className="mt-1 text-[12px] text-muted-foreground/60" data-testid="duel-opponents">vs {opponentLabel(state.opponents)}</p>}
            </GlassCard>
          )}

          {state.phase === "playing" && state.round && (
            <>
              <Question state={state} userId={userId} onSubmit={(p, a, iv) => void submit(p, a, iv)} />
              <p className="mt-3 text-center text-[12px] text-muted-foreground/60" data-testid="duel-points">Points: {state.points}</p>
            </>
          )}

          {state.phase === "ended" && state.end && (
            <Results end={state.end} userId={userId} onAgain={reset} onExit={() => router.push("/play")} />
          )}

          {state.phase === "error" && (
            <GlassCard className="p-6 text-center">
              <div role="alert" data-testid="duel-error" className="flex items-center justify-center gap-2 text-[13px] font-medium text-destructive">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{state.error}</span>
              </div>
              <Button className="mt-5" fullWidth onClick={reset}>Try again</Button>
            </GlassCard>
          )}

          {state.phase === "playing" && state.error && (
            <p role="alert" data-testid="duel-send-error" className="mt-3 text-center text-[12px] text-destructive">{state.error}</p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
