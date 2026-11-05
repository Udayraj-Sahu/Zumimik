import { freshThetaState, rebuildStates, type CatalogSkill, type MasterySnapshot, type ThetaState } from "@vmsg/psychometrics";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { attemptsFromEvents } from "@/lib/learning/event-replay";
import { flushEventQueue, pendingEvents } from "./offline/sync";
import { PRACTICE_SUBJECT, restoreTheta } from "@/lib/learning/ability";
import type { SinkingBook } from "@/lib/learning/review";
import { learnerKeys } from "@/lib/learning/storage-keys";
import { IS_MOCK, safeLocalStorage } from "@/lib/platform";
import { apiGet } from "./api";
import { ageFromDob, hydrateLearner, type LearnerStates } from "@/lib/learning/learner-state";

/**
 * The learner's persisted mastery and the practice catalog, fetched once and shared.
 *   GET /api/v1/practice/mastery -> { technique_states, as_of, selection } (the snapshot the device hydrates from)
 *   GET /api/v1/practice/catalog -> { catalog_version, skills: [{ skill, servable, parents, ... }] }
 * Both are cached in memory so a session start, a results screen and the planner do not each re-request them; a successful
 * sync invalidates the mastery copy because the server's picture just changed.
 */
const MASTERY_TTL_MS = 60_000;
const CATALOG_TTL_MS = 5 * 60_000;

let masteryCache: { at: number; userKey: string; promise: Promise<MasterySnapshot> } | null = null;
let catalogCache: { at: number; promise: Promise<CatalogSkill[]> } | null = null;

export function invalidateLearnerCache(): void {
  masteryCache = null;
}

export function resetLearnerCaches(): void {
  masteryCache = null;
  catalogCache = null;
}

/** Raw snapshot. Rejects when it cannot be read: callers must treat that as "unknown", never as "new learner". */
export function loadMasterySnapshot(userKey = ""): Promise<MasterySnapshot> {
  const now = Date.now();
  if (masteryCache && masteryCache.userKey === userKey && now - masteryCache.at < MASTERY_TTL_MS) return masteryCache.promise;
  const promise = apiGet<MasterySnapshot>("/practice/mastery");
  masteryCache = { at: now, userKey, promise };
  promise.catch(() => {
    if (masteryCache?.promise === promise) masteryCache = null; // do not cache a failure
  });
  return promise;
}

const SNAPSHOT_KEY = learnerKeys.snapshot;

function rememberSnapshot(userKey: string, snapshot: MasterySnapshot): void {
  try {
    safeLocalStorage.setItem(SNAPSHOT_KEY(userKey), JSON.stringify(snapshot));
  } catch {
    /* storage full or unavailable: the next online read still works */
  }
}

/** The last snapshot this device read for this learner, so an offline session still builds on real history. */
function recallSnapshot(userKey: string): MasterySnapshot | null {
  try {
    const raw = safeLocalStorage.getItem(SNAPSHOT_KEY(userKey));
    return raw ? (JSON.parse(raw) as MasterySnapshot) : null;
  } catch {
    return null;
  }
}

/**
 * One learner-state operation at a time. Reading the state, building a session's events and queuing them must not interleave
 * with another session doing the same: two sessions finishing together would each start from the same base and the later
 * snapshot would drop the earlier one. Chained promises, so an exception in one step never blocks the next.
 */
let learnerLock: Promise<unknown> = Promise.resolve();
export function withLearnerLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = learnerLock.then(fn, fn);
  learnerLock = run.catch(() => undefined);
  return run;
}

/**
 * The learner's current engine states, event-sourced (NOT serialized under the lock; use `loadLearnerStates` or hold the lock):
 *   1. flush the events still queued on the device, so the server is as current as it can be and we learn what it acknowledged;
 *   2. read the server snapshot (the last good copy if offline): it already contains every acknowledged event;
 *   3. replay only the events that are STILL unacknowledged over it (queued, not parked), in time order, deduplicated by id.
 * An acknowledged event is in the snapshot and gone from the queue, an unacknowledged one is in the queue and not in the
 * snapshot, so nothing is applied twice and nothing is lost. If neither a fresh nor a remembered snapshot exists, the history is
 * unknown and this returns null: never a blank learner.
 */
export async function reconcileLearnerStates(userKey = "", now = Date.now()): Promise<LearnerStates | null> {
  if (IS_MOCK) return null;
  try {
    const sent = await flushEventQueue();
    if (sent > 0) invalidateLearnerCache(); // the server's picture just changed: do not read a cached older one
  } catch {
    /* offline or server trouble: the queue stays as it is and is replayed below */
  }
  let snapshot: MasterySnapshot | null = null;
  try {
    snapshot = await loadMasterySnapshot(userKey);
    if (userKey) rememberSnapshot(userKey, snapshot);
  } catch {
    snapshot = userKey ? recallSnapshot(userKey) : null;
  }
  if (!snapshot) return null;
  const base = hydrateLearner(snapshot, now);
  const age = ageFromDob(useOnboardingStore.getState().dob, now);
  const pending = attemptsFromEvents(await pendingEvents(), now, age);
  return pending.length === 0 ? base : rebuildStates(base, pending, now);
}

/** Engine states as of now; null when real mastery cannot be known (demo mode has no server history). */
export function loadLearnerStates(userKey = "", now = Date.now()): Promise<LearnerStates | null> {
  return withLearnerLock(() => reconcileLearnerStates(userKey, now));
}

export function loadCatalogSkills(): Promise<CatalogSkill[]> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) return catalogCache.promise;
  const promise = apiGet<{ skills?: Array<{ skill?: string; parents?: string[]; servable?: number }> }>("/practice/catalog").then((res) =>
    (res.skills ?? [])
      .filter((s): s is { skill: string; parents?: string[]; servable?: number } => typeof s.skill === "string")
      .map((s) => ({ skill: s.skill, parents: s.parents ?? [], ...(typeof s.servable === "number" ? { servable: s.servable } : {}) })),
  );
  catalogCache = { at: now, promise };
  promise.catch(() => {
    if (catalogCache?.promise === promise) catalogCache = null;
  });
  return promise;
}

// ── ability (IRT θ) ─────────────────────────────────────────────────────────
// The server does not return θ from GET /practice/mastery (its `theta` column is written by a worker that has not landed), so
// the device keeps the learner's own estimate. It is rebuilt from the stored responses on every read (restoreTheta), and each
// finished session also sends it on `session_end.metadata.theta`, where the server logs it.
const THETA_KEY = learnerKeys.ability;

export function loadAbility(userKey: string): ThetaState {
  if (!userKey) return freshThetaState(PRACTICE_SUBJECT);
  try {
    const raw = safeLocalStorage.getItem(THETA_KEY(userKey));
    return restoreTheta(raw ? JSON.parse(raw) : null);
  } catch {
    return freshThetaState(PRACTICE_SUBJECT);
  }
}

export function commitAbility(userKey: string, state: ThetaState): void {
  if (!userKey) return;
  try {
    safeLocalStorage.setItem(THETA_KEY(userKey), JSON.stringify(state));
  } catch {
    /* storage unavailable: the estimate is rebuilt from the next sessions */
  }
}

// ── review book (spaced repetition) ─────────────────────────────────────────
// The server's sinking_skills table has no writer and no read route yet, so the learner's review entries live on this device,
// updated with every finished session (under the same lock as the mastery snapshot) and by mock-exam results.
const SINKING_KEY = learnerKeys.reviewBook;

export function loadSinkingBook(userKey: string): SinkingBook {
  if (!userKey) return {};
  try {
    const raw = safeLocalStorage.getItem(SINKING_KEY(userKey));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SinkingBook = {};
    for (const [id, v] of Object.entries(parsed as Record<string, Partial<SinkingBook[string]>>)) {
      if (v && typeof v.decayPriority === "number" && Number.isFinite(v.decayPriority) && typeof v.techniqueId === "string") out[id] = v as SinkingBook[string];
    }
    return out;
  } catch {
    return {};
  }
}

export function commitSinkingBook(userKey: string, book: SinkingBook): void {
  if (!userKey) return;
  try {
    safeLocalStorage.setItem(SINKING_KEY(userKey), JSON.stringify(book));
  } catch {
    /* storage unavailable: review entries are rebuilt from the next sessions */
  }
}
