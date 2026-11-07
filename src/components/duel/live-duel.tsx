"use client";
import { useEffect, useRef, useState } from "react";
import { MathText } from "@/components/ui/math-text";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Repeat, Swords, Timer, TrendingUp, Trophy, X, XCircle } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { HubCheckinCard } from "@/components/duel/hub-checkin-card";
import { useLiveDuel, type LiveDuelState } from "@/hooks/use-live-duel";
import { questionOf, type DuelMatchEnd, type DuelPlayer, type IoFactory } from "@/services/duel-live";

/** The server counts five seconds between pairing and the first round (duel.ts COUNTDOWN_SECONDS). */
const GET_READY_SECONDS = 5;

/** Who the learner plays: the server sends no names, only an id and a kind (human or bot). */
function opponentLabel(players: DuelPlayer[]): string {
  if (players.length === 0) return "";
  const bots = players.filter((o) => o.opponent_kind === "bot").length;
  if (players.length === 1) return bots === 1 ? "a bot" : "another player";
  return `${players.length} players${bots > 0 ? ` (${bots} bot${bots === 1 ? "" : "s"})` : ""}`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Panel surface used across the duel screens: theme tokens only, so it reads in light, dark and study. */
const PANEL = "rounded-3xl border border-border bg-card p-5 sm:p-6";

function Avatar({ label, you }: { label: string; you?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-14 shrink-0 place-items-center rounded-full text-[18px] font-black",
        you ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
      )}
    >
      {label}
    </span>
  );
}

/** Whole seconds since `active` last became true (0 while it is false). */
function useElapsed(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);
  return seconds;
}

function Rule({ icon: Icon, children }: { icon: typeof Repeat; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={15} aria-hidden />
      </span>
      <span className="text-[13px] leading-snug text-foreground/85">{children}</span>
    </li>
  );
}

function Intro({ onFind }: { onFind: () => void }) {
  return (
    <section className={PANEL} aria-labelledby="duel-rules">
      <h2 id="duel-rules" className="text-[18px] font-bold tracking-[-0.02em] text-foreground">Accuracy Duel</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">One opponent. One question at a time. Stay accurate and stay in.</p>
      <ul className="mt-5 space-y-3.5" aria-label="How it works">
        <Rule icon={Repeat}>You and your opponent take turns answering.</Rule>
        <Rule icon={Timer}>Each turn is timed. Running out of time ends the duel.</Rule>
        <Rule icon={XCircle}>A wrong answer ends it too, and the other player wins.</Rule>
        <Rule icon={TrendingUp}>Your rating goes up with a win and down with a loss.</Rule>
      </ul>
      <Button className="mt-6" fullWidth size="lg" onClick={onFind} data-testid="duel-find">
        <Swords size={16} aria-hidden /> Find a match
      </Button>
      <HubCheckinCard />
    </section>
  );
}

function Searching({ wait, onCancel }: { wait: number | null; onCancel: () => void }) {
  const elapsed = useElapsed(true);
  return (
    <section className={cn(PANEL, "text-center")} data-testid="duel-searching" aria-live="polite">
      <div className="relative mx-auto grid size-20 place-items-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-primary/15 motion-safe:animate-ping" />
        <span aria-hidden className="absolute inset-2 rounded-full bg-primary/20" />
        <Swords size={26} className="relative text-primary" aria-hidden />
      </div>
      <h2 className="mt-4 text-[16px] font-bold text-foreground">Looking for an opponent</h2>
      <p className="mt-1 font-mono text-[22px] font-bold tabular-nums text-primary" aria-label={`Searching for ${elapsed} seconds`}>{clock(elapsed)}</p>
      {wait !== null && (
        <p className="mt-1 text-[12px] text-muted-foreground" data-testid="duel-wait">
          Estimated wait about {Math.max(1, Math.round(wait / 60))} min. It can take longer when few players are online.
        </p>
      )}
      <Button className="mt-5" variant="glass" fullWidth onClick={onCancel} data-testid="duel-cancel">Cancel search</Button>
    </section>
  );
}

function GetReady({ opponents, name }: { opponents: DuelPlayer[]; name: string }) {
  const [left, setLeft] = useState(GET_READY_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className={cn(PANEL, "text-center")} data-testid="duel-joining" aria-live="polite">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Match found</p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar label={name.charAt(0).toUpperCase() || "Y"} you />
          <span className="text-[12px] font-semibold text-foreground">You</span>
        </div>
        <span className="text-[20px] font-black tracking-widest text-muted-foreground">VS</span>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar label="?" />
          <span className="text-[12px] font-semibold text-foreground">Opponent</span>
        </div>
      </div>
      {opponents.length > 0 && (
        <p className="mt-3 text-[12px] text-muted-foreground" data-testid="duel-opponents">vs {opponentLabel(opponents)}</p>
      )}
      <p className="mt-4 text-[13px] text-foreground/85">{left > 0 ? `First question in ${left}…` : "Here it comes…"}</p>
    </section>
  );
}

function Countdown({ limitMs, since, active }: { limitMs: number; since: number; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active, since]);
  const left = Math.max(0, limitMs - (now - since));
  const pct = limitMs > 0 ? Math.min(100, (left / limitMs) * 100) : 0;
  const urgent = left <= 8000;
  return (
    <div data-testid="duel-timer" role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-200", urgent ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("mt-1 text-right font-mono text-[12px] font-bold tabular-nums", urgent ? "text-destructive" : "text-muted-foreground")}>{Math.ceil(left / 1000)}s</p>
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
    <section className={PANEL} data-testid="duel-round" aria-label={`Round ${round.round_number}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Round {round.round_number}</span>
        <span
          data-testid="duel-turn"
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
            myTurn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {myTurn ? "Your turn" : "Opponent's turn"}
        </span>
      </div>
      <div className="mt-4">
        <Countdown limitMs={round.problem.time_limit_ms} since={state.roundReceivedAt ?? Date.now()} active={!over} />
      </div>
      <p data-testid="duel-question" className="mt-4 whitespace-pre-wrap text-[18px] font-semibold leading-snug text-foreground"><MathText text={questionOf(round.problem)} /></p>

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
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 font-mono text-[16px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button type="submit" disabled={!canAnswer || !answer.trim()} className="min-h-12 px-5">
            {state.answered && !over ? <Loader2 size={16} className="animate-spin" aria-label="Checking" /> : "Submit"}
          </Button>
        </form>
      ) : (
        !over && <p className="mt-5 text-center text-[13px] text-muted-foreground" data-testid="duel-waiting">Waiting for your opponent to answer…</p>
      )}

      {state.verdict !== null && !over && (
        <p data-testid="duel-verdict" className={cn("mt-3 flex items-center gap-1.5 text-[13px] font-semibold", state.verdict ? "text-primary" : "text-destructive")}>
          {state.verdict ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />} {state.verdict ? "Correct" : "Not quite"}
        </p>
      )}
      {over && (
        <div data-testid="duel-round-end" className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-[13px]">
          <p className={cn("font-semibold", state.roundEnd!.correct ? "text-primary" : "text-destructive")}>
            {state.roundEnd!.user_id && userId && state.roundEnd!.user_id !== userId
              ? state.roundEnd!.correct ? "Your opponent got it right" : "Your opponent got it wrong"
              : state.roundEnd!.correct ? "Correct" : "Incorrect"}
          </p>
          {state.roundEnd!.correct_answer !== undefined && <p className="mt-0.5 text-muted-foreground">Answer: <MathText text={String(state.roundEnd!.correct_answer)} /></p>}
          <p className="mt-0.5 text-muted-foreground">{signed(state.roundEnd!.points_earned)} points</p>
        </div>
      )}
    </section>
  );
}

/** Why the duel ended, from the losing player's side. The reason always describes the loser. */
function reasonText(reason: string | null | undefined, loserIsMe: boolean | null): string | null {
  if (!reason) return null;
  if (reason === "wrong_answer") return loserIsMe === false ? "Your opponent gave a wrong answer." : "A wrong answer ended the duel.";
  if (reason === "timeout") return loserIsMe === false ? "Time ran out on your opponent's turn." : "Time ran out on your turn.";
  if (reason === "forfeit") return loserIsMe === false ? "Your opponent left the match." : "You lost the connection for too long.";
  return reason.replace(/_/g, " ");
}

function Results({ end, userId, onAgain, onExit }: { end: DuelMatchEnd; userId: string | null; onAgain: () => void; onExit: () => void }) {
  const rankings = (Array.isArray(end.rankings) ? [...end.rankings] : []).sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99));
  const me = rankings.find((r) => r.user_id === userId);
  const won = me?.rank === 1;
  const elo = (end.elo_updates ?? []).find((u) => u.user_id === userId);
  const reason = reasonText(end.elimination_reason, me ? !won : null);
  return (
    <section className={cn(PANEL, "text-center")} data-testid="duel-results" aria-live="polite">
      <span className={cn("mx-auto grid size-16 place-items-center rounded-full", won ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
        <Trophy size={28} aria-hidden />
      </span>
      <h2 data-testid="duel-outcome" className="mt-3 text-[26px] font-black tracking-[-0.03em] text-foreground">{me ? (won ? "You won" : "You lost") : "Match over"}</h2>
      {reason && <p className="mt-1 text-[13px] text-muted-foreground" data-testid="duel-reason">{reason}</p>}
      {end.rated === false && <p className="mt-1 text-[12px] text-muted-foreground">Unrated match</p>}
      {elo && (
        <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-border bg-background px-4 py-3" data-testid="duel-elo">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Rating</p>
          <p className="mt-1 font-mono text-[18px] font-bold tabular-nums text-foreground">
            {elo.elo_before} → {elo.elo_after}{" "}
            <span className={cn("text-[14px]", elo.elo_change >= 0 ? "text-primary" : "text-destructive")}>({signed(elo.elo_change)})</span>
          </p>
        </div>
      )}
      {rankings.length > 0 && (
        <ol className="mt-5 space-y-2 text-left" data-testid="duel-rankings" aria-label="Final standings">
          {rankings.map((r, i) => {
            const mine = !!userId && r.user_id === userId;
            return (
              <li key={r.user_id ?? i} className={cn("flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[13px]", mine ? "border-primary/50 bg-primary/10" : "border-border")}>
                <span className="font-mono text-[12px] text-muted-foreground">{r.rank ?? i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{mine ? "You" : "Opponent"}</span>
                {typeof r.score === "number" && <span className="font-mono tabular-nums text-muted-foreground">{r.score}</span>}
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-6 flex gap-2">
        <Button variant="glass" fullWidth onClick={onExit}>Back</Button>
        <Button fullWidth onClick={onAgain}>Play again</Button>
      </div>
    </section>
  );
}

/** Real-mode duel: matchmaking and the live match over the server's sockets. `io` is injectable for tests. */
export function LiveDuel({ io }: { io?: IoFactory } = {}) {
  usePageMeta("Duel — Zuzumik");
  const router = useRouter();
  const { state, find, cancel, submit, reset, userId } = useLiveDuel(io);
  const name = useAuthStore((s) => s.user?.name ?? "");

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-xl">
        <div className="text-center">
          <div className="pill mb-3 inline-flex items-center gap-2 px-4 py-1.5">
            <Swords size={12} className="text-primary" aria-hidden />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">DUEL</h1>
          </div>
          <p className="text-[12px] text-muted-foreground">Compete head-to-head in real time</p>
        </div>

        <div className="mt-6" aria-live="polite">
          {state.reconnecting && <p role="status" data-testid="duel-reconnecting" className="mb-3 text-center text-[12px] text-muted-foreground">Connection lost. Reconnecting…</p>}
          {state.opponentAway !== null && <p role="status" data-testid="duel-away" className="mb-3 text-center text-[12px] text-muted-foreground">Your opponent lost their connection. They have {state.opponentAway} seconds to come back.</p>}

          {state.phase === "idle" && <Intro onFind={() => find()} />}

          {state.phase === "searching" && <Searching wait={state.estimatedWait} onCancel={cancel} />}

          {state.phase === "joining" && <GetReady opponents={state.opponents} name={name} />}

          {state.phase === "playing" && state.round && (
            <>
              <Question state={state} userId={userId} onSubmit={(p, a, iv) => void submit(p, a, iv)} />
              <p className="mt-3 text-center text-[12px] text-muted-foreground" data-testid="duel-points">Points: {state.points}</p>
            </>
          )}

          {state.phase === "ended" && state.end && (
            <Results end={state.end} userId={userId} onAgain={reset} onExit={() => router.push("/play")} />
          )}

          {state.phase === "error" && (
            <section className={cn(PANEL, "text-center")}>
              <div role="alert" data-testid="duel-error" className="flex items-center justify-center gap-2 text-[13px] font-medium text-destructive">
                <AlertTriangle size={16} className="shrink-0" aria-hidden />
                <span>{state.error}</span>
              </div>
              <Button className="mt-5" fullWidth onClick={reset}>Try again</Button>
            </section>
          )}

          {state.phase === "playing" && state.error && (
            <p role="alert" data-testid="duel-send-error" className="mt-3 text-center text-[12px] text-destructive">{state.error}</p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
