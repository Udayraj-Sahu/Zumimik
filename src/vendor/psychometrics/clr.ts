/**
 * CLR controller (COG-09) and exam-sprint stamina (COG-10) — DFV §7.6, live in
 * Phase 1 (MEM/owner-decisions-2026-10-08.md:10-11; VMSG:332).
 *
 * The sources give three versions of the general CLR:
 * - VMSG:314: "reduce difficulty, force guided, cap attempts to 3";
 * - AR:495: `ui_mode` down one level, a 120 s micro-break, "cap new problems at 3";
 * - ARCH/vedic_speed_gym_backend.md:5861: "reduce difficulty by 1".
 * Resolution [REC, Q18]: force `guided` (COG-09 wins over "down one level"); serve
 * at most 3 further new (frontier) problems; reorder the remaining PRE-FETCHED
 * items lowest difficulty first (no server call, works offline); a 120 s
 * micro-break. The window is the session: CLR exits at session_end, or at the
 * first evaluated checkpoint after the break with fi ≤ threshold.
 *
 * Exam sprint (COG-10) replaces the 3-problem cap with the stamina ratio rather
 * than adding the ratio to it (AR:496 is a separate row from AR:495): a cap of 3
 * would starve the ratio's 30% new-material floor (AR:667) for the rest of the
 * sprint. Phase-A review defect 1, fixed 2026-10-09.
 *
 * Like fatigue.ts this never sees a `TechniqueState`: CLR cannot write P(L), the
 * BKT state or θ (design §2).
 */
import type { Bucket, RenderMode } from "@vmsg/shared-types";
import type { ActivePath } from "./calibration";
import type { AllocationPercentages } from "./constants";
import type { FatigueCheckpoint } from "./fatigue";

// ── constants ────────────────────────────────────────────────────────────────

/** AR:495. */
export const CLR_MICRO_BREAK_S = 120;
/** VMSG:314 ("cap attempts to 3") read as AR:495's "cap new problems at 3" [REC, Q18]. */
export const CLR_NEW_PROBLEM_CAP = 3;
/** AR:497: a second trigger in the window forces a 5-minute external break and
 *  Sinking-only revision. */
export const CLR_FORCED_BREAK_S = 5 * 60;
/** [REC, Q20] ARCH/vedic_speed_gym_backend.md:5862 "DFV > 2× threshold" hard
 *  stop, adopted as the `dfv_2x` trigger for the forced break (protective). */
export const CLR_DOUBLE_THRESHOLD_FACTOR = 2;

/** COG-10 ratio bands, VMSG:314 and AR:650-657. Upper bounds are inclusive (`≤`, AR:653-655). */
export const STAMINA_RATIO_BANDS: ReadonlyArray<{ uptoMin: number; new: number; review: number }> = [
  { uptoMin: 45, new: 0.7, review: 0.3 },
  { uptoMin: 90, new: 0.5, review: 0.5 },
  { uptoMin: 120, new: 0.3, review: 0.7 },
];
/** AR:656: past 120 min, hard stop. Wall-clock per calendar day, resetting after
 *  sleep, not a rolling active-practice total (AR:665). */
export const STAMINA_HARD_STOP_MIN = 120;
/** AR:829: Sinking is 20% OF the review share (sub-allocation, not additive). */
export const STAMINA_SINKING_SHARE_OF_REVIEW = 0.2;
/** AR:609: 60-minute blocks. */
export const STAMINA_BLOCK_MIN = 60;
/** [REC, Q19] 15 min (AR:665) over 10 min (AR:610): the protective reading, used
 *  for both the between-blocks break and the hard-stop break. AR:611's "max 3
 *  blocks/day" has no constant here: under AR:665's 120-minute daily cap a third
 *  block is unreachable, and a limit nothing can reach is not encoded. */
export const STAMINA_BREAK_MIN = 15;

// ── goal ─────────────────────────────────────────────────────────────────────

export type ClrGoal = "exam_sprint" | "general";

/** [REC, Q19] AR's `goal == exam_sprint` (AR:496, 647) has no field in this
 *  build; the nearest is the 3-path routing, so `exam_sprint` means the active
 *  path is `exam_prep` (calibration.ts:40-56). */
export function clrGoal(activePath: ActivePath | null | undefined): ClrGoal {
  return activePath === "exam_prep" ? "exam_sprint" : "general";
}

// ── stamina ──────────────────────────────────────────────────────────────────

export type RatioSlippage =
  | { new: number; review: number; hardStop: false }
  | { new: 0; review: 0; hardStop: true };

function assertElapsed(name: string, ms: number): void {
  // NaN fails every `≤` and would land on the hard stop silently — refuse it.
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`${name} must be a finite duration ≥ 0 ms, got ${ms}`);
}

/** AR:650-657 `computeRatioSlippage`: exactly 45, 90 or 120 minutes is the LOWER
 *  band; anything over 120 minutes is the hard stop. */
export function ratioSlippage(elapsedMs: number): RatioSlippage {
  assertElapsed("elapsedMs", elapsedMs);
  const minutes = elapsedMs / 60_000;
  for (const band of STAMINA_RATIO_BANDS) {
    if (minutes <= band.uptoMin) return { new: band.new, review: band.review, hardStop: false };
  }
  return { new: 0, review: 0, hardStop: true };
}

/**
 * The ratio as session-bucket percentages, for `composeAllocation` in place of
 * the persona/cluster table. [REC, Q19] new → frontier; review → sinking (20% of
 * review, AR:829) + primary (the other 80%, "general review"). So 30/70 is
 * frontier 0.30, sinking 0.14, primary 0.56 — AR:829's own worked numbers.
 * The frontier share never falls below 0.30 before the hard stop (AR:667's
 * evidence floor). `null` after the hard stop: nothing may be composed.
 */
export function staminaAllocation(elapsedMs: number): AllocationPercentages | null {
  const r = ratioSlippage(elapsedMs);
  if (r.hardStop) return null;
  const sinking = r.review * STAMINA_SINKING_SHARE_OF_REVIEW;
  return { primary: r.review - sinking, sinking, frontier: r.new };
}

// ── the controller ───────────────────────────────────────────────────────────

export type ClrTrigger = "dfv" | "dfv_2x";
export type ClrIntervention = "standard" | "stamina" | "forced_break";

export type ClrAction =
  | { kind: "force_ui_mode"; mode: "guided"; from: RenderMode }
  | { kind: "micro_break"; seconds: number }
  | { kind: "forced_break"; seconds: number }
  /** At most `max` further frontier problems while CLR lasts (0 = none). Not
   *  emitted for stamina: there the ratio governs new material. */
  | { kind: "cap_new_problems"; max: number }
  /** Reorder the remaining pre-fetched queue with `clrQueue`. */
  | { kind: "reorder_easiest_first" }
  /** Serve Sinking items only (AR:497). While it lasts it overrides the ratio. */
  | { kind: "sinking_only" }
  /** Exam sprint: compose from now on with this allocation (`staminaAllocation`,
   *  AR:647). Emitted whenever the ratio starts to apply or its band changes —
   *  on engagement, at each 45/90-minute band crossing, and again after an
   *  `exit_clr` or when Sinking-only lifts — so the last one received is always
   *  the one in force. Never emitted while Sinking-only is on. */
  | { kind: "ratio_slippage"; ratio: { new: number; review: number }; allocation: AllocationPercentages }
  /** Exam sprint: a 60-minute block ended inside this session (AR:609-610). */
  | { kind: "block_break"; minutes: number }
  /** Exam sprint: over 120 minutes today; stop and break (AR:656, 665). */
  | { kind: "hard_stop"; breakMinutes: number }
  /** CLR lifted: restore the learner's own UI mode and the full queue. It does
   *  NOT lift an engaged stamina ratio: in an exam sprint a `ratio_slippage`
   *  follows it in the same step, restating the band in force. */
  | { kind: "exit_clr"; restoreUiMode: RenderMode | null };

export interface ClrState {
  /** CLR on: guided forced; new problems capped (standard) or Sinking only (forced). */
  active: boolean;
  /** Triggers seen this session (the window is the session, [REC, Q18]); a
   *  second gives the forced break. Survives an exit. */
  triggers: number;
  intervention: ClrIntervention | null;
  /** The mode the learner was in before CLR forced guided; restored on exit. */
  uiModeBefore: RenderMode | null;
  /** Further frontier problems allowed while active, counted from the
   *  activation; null when not active, and null under stamina (no cap). */
  newProblemCap: number | null;
  /** Frontier problems served since this activation (`recordClrServed`); the
   *  cap left is `newProblemCap − newServed`. 0 when not active. */
  newServed: number;
  sinkingOnly: boolean;
  /** Session-elapsed ms at which the running break ends; exit waits for it. */
  breakEndsAtMs: number | null;
  /** Exam sprint: ratio slippage engaged by the first trigger (AR:647); sticky. */
  staminaEngaged: boolean;
  /** Exam sprint: the ratio last announced by a `ratio_slippage` action and not
   *  since suspended (Sinking-only), reset (`exit_clr`) or left (goal changed);
   *  null when none is in force. A different band re-announces. */
  announcedRatio: { new: number; review: number } | null;
  /** Exam sprint: 60-minute block boundaries accounted for — those that fell
   *  before this session started (that gap was the break) and those whose
   *  `block_break` this session issued. */
  blockBreaks: number;
  hardStopped: boolean;
  /** `scoredCount` of the last checkpoint processed — makes `stepClr` idempotent. */
  lastCheckpoint: number;
}

export function initialClrState(): ClrState {
  return {
    active: false,
    triggers: 0,
    intervention: null,
    uiModeBefore: null,
    newProblemCap: null,
    newServed: 0,
    sinkingOnly: false,
    breakEndsAtMs: null,
    staminaEngaged: false,
    announcedRatio: null,
    blockBreaks: 0,
    hardStopped: false,
    lastCheckpoint: 0,
  };
}

export interface ClrContext {
  goal: ClrGoal;
  /** The UI mode the learner is in right now. */
  uiMode: RenderMode;
  /** Milliseconds since session_start. */
  sessionElapsedMs: number;
  /** Exam sprint only: practice time today, wall-clock, resetting each calendar
   *  day (AR:665). Defaults to `sessionElapsedMs`. `staminaElapsedMs −
   *  sessionElapsedMs` is then the part of today that came before this session,
   *  and block boundaries in it do not get a break here. */
  staminaElapsedMs?: number;
}

/** `clr_mode_activated`, psychometric, never sampled (services/api/app/telemetry.py:81).
 *  No source defines this payload; design §4.3 does, and these are exactly its keys.
 *  `micro_break_s` and `new_problem_cap` carry what was actually imposed — design
 *  §4.3 wrote them as the literals 120 and 3, which would misreport two of the
 *  three interventions:
 *  - `standard`: 120 and 3 (AR:495);
 *  - `stamina`: 120 and `null` — no cap: AR:496 sends exam sprint to Stamina Mode
 *    INSTEAD of AR:495's row, and a cap of 3 would starve AR:667's 30% new floor;
 *  - `forced_break`: 300 and 0 (AR:497: a 5-minute break, Sinking only).
 *  `ratio` is present only for `stamina`. */
export interface ClrModeActivatedPayload {
  trigger: ClrTrigger;
  dfv_score: number;
  age_threshold: number;
  goal: ClrGoal;
  intervention: ClrIntervention;
  ui_mode_from: RenderMode;
  ui_mode_to: "guided";
  micro_break_s: number;
  new_problem_cap: number | null;
  ratio?: { new: number; review: number };
}

export const CLR_MODE_ACTIVATED_EVENT = "clr_mode_activated" as const;

export function clrModeActivatedPayload(p: {
  trigger: ClrTrigger;
  fatigueIndex: number;
  ageThreshold: number;
  goal: ClrGoal;
  intervention: ClrIntervention;
  uiModeFrom: RenderMode;
  microBreakS: number;
  newProblemCap: number | null;
  ratio?: { new: number; review: number };
}): ClrModeActivatedPayload {
  for (const [k, v] of [
    ["fatigueIndex", p.fatigueIndex],
    ["ageThreshold", p.ageThreshold],
    ["microBreakS", p.microBreakS],
  ] as const) {
    if (!Number.isFinite(v)) throw new RangeError(`${k} must be finite, got ${v}`);
  }
  if ((p.intervention === "stamina") !== (p.ratio !== undefined)) {
    throw new RangeError("ratio is carried by, and only by, the stamina intervention");
  }
  if ((p.intervention === "stamina") !== (p.newProblemCap === null)) {
    throw new RangeError("new_problem_cap is null for, and only for, the stamina intervention");
  }
  if (p.newProblemCap !== null && !(Number.isInteger(p.newProblemCap) && p.newProblemCap >= 0)) {
    throw new RangeError(`newProblemCap must be a count ≥ 0 or null, got ${p.newProblemCap}`);
  }
  const payload: ClrModeActivatedPayload = {
    trigger: p.trigger,
    dfv_score: p.fatigueIndex,
    age_threshold: p.ageThreshold,
    goal: p.goal,
    intervention: p.intervention,
    ui_mode_from: p.uiModeFrom,
    ui_mode_to: "guided",
    micro_break_s: p.microBreakS,
    new_problem_cap: p.newProblemCap,
  };
  if (p.ratio !== undefined) payload.ratio = { new: p.ratio.new, review: p.ratio.review };
  return payload;
}

export interface ClrStep {
  clrState: ClrState;
  actions: ClrAction[];
  event?: ClrModeActivatedPayload;
}

/** Block boundaries (60, …) reached at `elapsedMs`, counting only those strictly
 *  before the hard stop: the last block ends AT the stop, not with a break. */
function blockBoundariesAt(elapsedMs: number): number {
  const lastBoundary = Math.ceil(STAMINA_HARD_STOP_MIN / STAMINA_BLOCK_MIN) - 1;
  return Math.min(Math.floor(elapsedMs / (STAMINA_BLOCK_MIN * 60_000)), lastBoundary);
}

/** Announce the stamina ratio if it applies and differs from the one last
 *  announced. Mutates the step's own state copy and action list. */
function reconcileRatio(state: ClrState, actions: ClrAction[], ctx: ClrContext, staminaElapsed: number): void {
  if (ctx.goal !== "exam_sprint") {
    state.announcedRatio = null; // left the sprint: re-announce if it comes back
    return;
  }
  if (!state.staminaEngaged || state.sinkingOnly || state.hardStopped) return;
  const slip = ratioSlippage(staminaElapsed);
  if (slip.hardStop) return; // handled before this is reached
  const prev = state.announcedRatio;
  if (prev !== null && prev.new === slip.new && prev.review === slip.review) return;
  const ratio = { new: slip.new, review: slip.review };
  state.announcedRatio = ratio;
  actions.push({ kind: "ratio_slippage", ratio: { ...ratio }, allocation: staminaAllocation(staminaElapsed)! });
}

/**
 * Call at every fatigue checkpoint (every 5 scored attempts) with that
 * checkpoint's result. Pure: returns a new state.
 *
 * - Idempotent: a checkpoint already processed (same `scoredCount`) yields no
 *   trigger and no event, so a replay or a double call never re-activates.
 *   The exam-sprint time rules and the ratio announcements are guarded by their
 *   own state, so a replay repeats none of them either.
 * - Exam sprint, always: past 120 minutes today → hard stop; at a 60-minute
 *   block boundary crossed during THIS session → a block break (a boundary that
 *   fell before the session started had the gap between sessions as its break).
 *   The hard stop ends everything after it.
 * - A trigger is an evaluated checkpoint with `exceeded`. The first in the
 *   session is `standard` (guided, the 120 s micro-break, at most 3 further new
 *   problems, easiest first) or, in an exam sprint, `stamina`: guided, the
 *   micro-break and easiest first, with the ratio slippage IN PLACE OF the cap
 *   (AR:496 replaces AR:495's row; AR:647 "restructures rather than
 *   terminating"; a cap would starve AR:667's 30% new floor). A second or later
 *   trigger, or any index over twice the threshold (`dfv_2x`), is the forced
 *   break with Sinking-only revision; in an exam sprint it still engages the
 *   ratio, which is announced once Sinking-only lifts.
 * - Exit: the first evaluated, calm checkpoint (fi ≤ threshold) once the break
 *   is over. An unevaluated checkpoint (e.g. the technique is no longer fluid)
 *   cannot exit, so CLR then lasts until session_end.
 * - Ratio: whenever it applies (engaged, not Sinking-only) and its band differs
 *   from the one last announced, a `ratio_slippage` action is the step's last.
 */
export function stepClr(prev: ClrState, checkpoint: FatigueCheckpoint, ctx: ClrContext): ClrStep {
  assertElapsed("sessionElapsedMs", ctx.sessionElapsedMs);
  const staminaElapsed = ctx.staminaElapsedMs ?? ctx.sessionElapsedMs;
  assertElapsed("staminaElapsedMs", staminaElapsed);

  const state: ClrState = { ...prev };
  const actions: ClrAction[] = [];
  if (state.hardStopped) return { clrState: state, actions };

  if (ctx.goal === "exam_sprint") {
    if (ratioSlippage(staminaElapsed).hardStop) {
      state.hardStopped = true;
      actions.push({ kind: "hard_stop", breakMinutes: STAMINA_BREAK_MIN });
      return { clrState: state, actions };
    }
    const beforeSession = blockBoundariesAt(Math.max(0, staminaElapsed - ctx.sessionElapsedMs));
    state.blockBreaks = Math.max(state.blockBreaks, beforeSession);
    const due = blockBoundariesAt(staminaElapsed);
    if (due > state.blockBreaks) {
      state.blockBreaks = due;
      actions.push({ kind: "block_break", minutes: STAMINA_BREAK_MIN });
    }
  }

  if (checkpoint.event === null || checkpoint.scoredCount <= state.lastCheckpoint) {
    reconcileRatio(state, actions, ctx, staminaElapsed);
    return { clrState: state, actions };
  }
  state.lastCheckpoint = checkpoint.scoredCount;

  if (checkpoint.exceeded && checkpoint.fi !== undefined) {
    const fi = checkpoint.fi;
    state.triggers += 1;
    const doubled = fi > CLR_DOUBLE_THRESHOLD_FACTOR * checkpoint.threshold;
    const forced = doubled || state.triggers >= 2;
    const exam = ctx.goal === "exam_sprint";
    if (!state.active) state.uiModeBefore = ctx.uiMode;
    state.active = true;
    state.newServed = 0;
    if (exam) state.staminaEngaged = true;
    actions.push({ kind: "force_ui_mode", mode: "guided", from: ctx.uiMode });

    let intervention: ClrIntervention;
    let breakS: number;
    let cap: number | null;
    if (forced) {
      intervention = "forced_break";
      breakS = CLR_FORCED_BREAK_S;
      cap = 0;
      state.sinkingOnly = true;
      state.announcedRatio = null; // Sinking only suspends the ratio
      actions.push({ kind: "forced_break", seconds: breakS }, { kind: "sinking_only" });
    } else if (exam) {
      intervention = "stamina";
      breakS = CLR_MICRO_BREAK_S;
      cap = null;
      state.announcedRatio = null; // announce the band in force now, below
      actions.push({ kind: "micro_break", seconds: breakS });
    } else {
      intervention = "standard";
      breakS = CLR_MICRO_BREAK_S;
      cap = CLR_NEW_PROBLEM_CAP;
      actions.push({ kind: "micro_break", seconds: breakS });
    }
    state.intervention = intervention;
    state.newProblemCap = cap;
    state.breakEndsAtMs = ctx.sessionElapsedMs + breakS * 1000;
    if (cap !== null) actions.push({ kind: "cap_new_problems", max: cap });
    actions.push({ kind: "reorder_easiest_first" });

    let ratio: { new: number; review: number } | undefined;
    if (intervention === "stamina") {
      const slip = ratioSlippage(staminaElapsed); // not the hard stop: checked above
      ratio = { new: slip.new, review: slip.review };
    }
    reconcileRatio(state, actions, ctx, staminaElapsed);

    const event = clrModeActivatedPayload({
      trigger: doubled ? "dfv_2x" : "dfv",
      fatigueIndex: fi,
      ageThreshold: checkpoint.threshold,
      goal: ctx.goal,
      intervention,
      uiModeFrom: ctx.uiMode,
      microBreakS: breakS,
      newProblemCap: cap,
      ...(ratio !== undefined ? { ratio } : {}),
    });
    return { clrState: state, actions, event };
  }

  const breakOver = state.breakEndsAtMs === null || ctx.sessionElapsedMs >= state.breakEndsAtMs;
  if (state.active && checkpoint.evaluated && !checkpoint.exceeded && breakOver) {
    actions.push({ kind: "exit_clr", restoreUiMode: state.uiModeBefore });
    state.active = false;
    state.uiModeBefore = null;
    state.newProblemCap = null;
    state.newServed = 0;
    state.sinkingOnly = false;
    state.breakEndsAtMs = null;
    state.announcedRatio = null; // "restore the full queue": restate the ratio, below
  }
  reconcileRatio(state, actions, ctx, staminaElapsed);
  return { clrState: state, actions };
}

// ── the offline queue ────────────────────────────────────────────────────────

export interface ClrQueueItem {
  bucket?: Bucket;
  /** 1–5; unknown sorts last (lowest difficulty FIRST is the point). */
  difficulty?: number;
  /** Base cognitive load (cognitive-load.ts) — the tiebreak, its only use. */
  bcl?: number;
}

function rank(v: number | undefined): number {
  return v !== undefined && Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
}

/**
 * Record that `item` was served. Call it for every item served while CLR is
 * active: it counts frontier items against the new-problem cap, so a page that
 * asks `clrQueue` for the next item from its remaining queue each time cannot
 * serve more than the cap. Counts only while a cap is in force (standard or
 * forced CLR; never under stamina or when inactive). Pure.
 */
export function recordClrServed(state: ClrState, item: Pick<ClrQueueItem, "bucket">): ClrState {
  if (!state.active || state.newProblemCap === null || item.bucket !== "frontier") return state;
  return { ...state, newServed: state.newServed + 1 };
}

/**
 * The remaining pre-fetched queue under CLR, offline (no refetch, design §4.4):
 * lowest difficulty first, BCL as the tiebreak, then the original order; at most
 * `newProblemCap − newServed` frontier items (no limit when the cap is null:
 * stamina); Sinking items only after a forced break. Inactive CLR returns the
 * queue unchanged. Idempotent for a fixed state.
 *
 * Either use: call it once and replace the queue with the result, or call it
 * for each next item on the queue that remains — in both cases pass every
 * served item to `recordClrServed`, or the second use leaks past the cap.
 * A `newServed` that is not a finite count fails closed (no new problems).
 */
export function clrQueue<T extends ClrQueueItem>(
  remaining: readonly T[],
  state: Pick<ClrState, "active" | "newProblemCap" | "sinkingOnly" | "newServed">,
): T[] {
  if (!state.active) return [...remaining];
  const ordered = remaining
    .map((item, i) => ({ item, i }))
    .sort(
      (a, b) =>
        rank(a.item.difficulty) - rank(b.item.difficulty) ||
        rank(a.item.bcl) - rank(b.item.bcl) ||
        a.i - b.i,
    )
    .map(({ item }) => item);
  if (state.sinkingOnly) return ordered.filter((it) => it.bucket === "sinking");
  let allowed = Number.POSITIVE_INFINITY;
  if (state.newProblemCap !== null) {
    const left = state.newProblemCap - state.newServed;
    allowed = left > 0 ? left : 0; // NaN fails `> 0`: closed
  }
  return ordered.filter((it) => {
    if (it.bucket !== "frontier") return true;
    if (allowed <= 0) return false;
    allowed -= 1;
    return true;
  });
}
