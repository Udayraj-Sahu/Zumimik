import type { SprintSession } from "@/lib/types/sprint-session";
import { apiGet, apiPost } from "./api";
import { mapBackendPracticeSession, type BackendPracticeSessionResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { ageFromDob, DEFAULT_AGE, type LearnerStates } from "@/lib/learning/learner-state";
import { WARMUP_SIZE } from "@/lib/learning/calibration";
import { planAdaptiveSession, type PracticeSlot } from "@/lib/learning/session-plan";
import { abilityForRequest, subjectOfItem, type AbilitySubject } from "@/lib/learning/ability-book";
import { loadAbilityBook, loadCatalogSkills, loadLearnerStates, loadSinkingBook } from "./learner";

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

/**
 * The backend has no difficulty parameter, but POST /practice/session accepts the learner's `theta` (-3..3), from which it targets
 * d* = clamp(round(3 + theta - ln(0.7/0.3)), 1, 5) and serves the items nearest d* first (an ordering, not a filter: when a level has
 * few questions its neighbours fill the rest). This is the theta whose target is exactly `level`.
 */
export function levelToTheta(level: PracticeLevel): number {
  return Math.round((level - 3 + Math.log(0.7 / 0.3)) * 1000) / 1000;
}

/** "L3" -> 3; anything else -> undefined. */
export function parseLevel(value: string | number | null | undefined): PracticeLevel | undefined {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/^L/i, ""));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as PracticeLevel) : undefined;
}

/** The cold-start warm-up: the engine composes six problems for a learner with no history (one per root skill, in catalog order). */
export const WARMUP_TOPIC = "adaptive:warmup";

/** The "topic" that asks the engine to compose the whole session from the learner's mastery instead of one technique. */
export const ADAPTIVE_MIX_TOPIC = "adaptive:mix";

/** Items with a repeated template id dropped, keeping the first. */
export function uniqueItems<T extends { template_id: string }>(items: ReadonlyArray<T>): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.template_id) ? false : (seen.add(i.template_id), true)));
}

/** Whole days to a valid, future exam date, or undefined (no date, unparsable, or already past): urgency is only applied from a reliable date. */
export function daysToExam(raw: string | undefined, now: number): number | undefined {
  if (!raw) return undefined;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t) || t < now) return undefined;
  return Math.ceil((t - now) / 86_400_000);
}

/**
 * The request slots for this learner. The engine (buildPools + composeSession) decides the buckets and, for the mix, the
 * techniques and counts; for a chosen technique the learner's pick wins every slot and the engine only labels its bucket and
 * supplies P(L). Returns null when real mastery is unreadable: the caller then sends the plain single-skill request instead
 * of planning for a "new learner" the server knows is not new.
 */
async function planSlots(skill: string | null, n: number, knownStates?: LearnerStates): Promise<PracticeSlot[] | null> {
  const now = Date.now();
  const onboarding = useOnboardingStore.getState();
  const states = knownStates ?? (await loadLearnerStates(useAuthStore.getState().user?.id ?? "", now));
  if (!states) return null;
  const catalog = await loadCatalogSkills();
  const plan = planAdaptiveSession({
    states, catalog, now, size: n,
    age: ageFromDob(onboarding.dob, now) ?? DEFAULT_AGE,
    persona: onboarding.persona ?? undefined,
    focusSkill: skill,
    // Spaced repetition: the review queue and the exam countdown decide which techniques the pools serve first.
    review: { book: loadSinkingBook(useAuthStore.getState().user?.id ?? ""), daysRemaining: daysToExam(onboarding.examDates[onboarding.targetExam], now) },
  });
  return plan.slots.length > 0 ? plan.slots : null;
}

/**
 * The θ sent with a session request. An explicit level the learner chose (Beginner/Advanced, a technique-page level) wins;
 * otherwise the learner's own ability estimate steers the difficulty window; before anything has been scored there is none
 * and the server uses its cold start.
 */
async function requestTheta(level: PracticeLevel | undefined, skills: ReadonlyArray<string>): Promise<number | undefined> {
  if (level) return levelToTheta(level);
  // The ability of the subject the requested techniques belong to, as the catalog names it. Skills the catalog gives no subject for are
  // unclassified (the learner's general practice estimate); a mix of subjects gets no theta rather than a guessed one.
  let catalog: Awaited<ReturnType<typeof loadCatalogSkills>> = [];
  try {
    catalog = await loadCatalogSkills();
  } catch {
    catalog = [];
  }
  const subjects: AbilitySubject[] = skills.map((s) => subjectOfItem(catalog.find((c) => c.skill === s)?.subject));
  return abilityForRequest(await loadAbilityBook(useAuthStore.getState().user?.id ?? ""), subjects);
}

/** Prefix marking a problem-bank topic label (GET /api/topics) in the `topic` slot, as opposed to a :Skill name. */
export const BANK_TOPIC_PREFIX = "bank:";

export async function getPracticeSession(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
  level?: PracticeLevel,
): Promise<SprintSession> {
  if (IS_MOCK) {
    const { generateSprintSession } = await import("@/lib/mock/sprint-session");
    const { delay } = await import("@/lib/mock/delay");

    await delay(150);
    return generateSprintSession(topic, length, difficulty, domain);
  }
  if (topic.startsWith(BANK_TOPIC_PREFIX)) {
    // A problem-bank topic is a corpus label, which is exactly what GET /practice/session?topic= filters on.
    const label = topic.slice(BANK_TOPIC_PREFIX.length);
    const size = Math.min(50, Math.max(1, Math.floor(length)));
    const response = await apiGet<BackendPracticeSessionResponse>(
      `/practice/session?topic=${encodeURIComponent(label)}&size=${size}`,
    );
    return mapBackendPracticeSession(response, { topic: label, difficulty, domain });
  }
  // `topic` here is a :Skill name from GET /practice/catalog. GET /practice/session filters on corpus topic/technique
  // labels, a near-disjoint vocabulary, so a catalog skill is requested as a slot: POST /practice/session
  // { slots: [{ skill, bucket, n }] } (n: 1-50). The backend has no difficulty parameter; difficulty is only a label.
  const isWarmup = topic === WARMUP_TOPIC;
  const n = isWarmup ? WARMUP_SIZE : Math.min(50, Math.max(1, Math.floor(length)));
  const isMix = topic === ADAPTIVE_MIX_TOPIC;
  let planned: PracticeSlot[] | null = null;
  try {
    planned = await planSlots(isMix || isWarmup ? null : topic, n, isWarmup ? {} : undefined);
  } catch {
    planned = null; // catalog unreadable: fall through to the plain request
  }
  if ((isMix || isWarmup) && !planned) throw new Error("Your learning profile could not be loaded, so a personalised mix cannot be built right now. Pick a topic or try again.");
  const slots = planned ?? [{ skill: topic, bucket: "primary" as const, n }];
  const theta = isWarmup ? undefined : await requestTheta(level, slots.map((s) => s.skill)); // a warm-up is the cold start: no theta yet
  const response = await apiPost<BackendPracticeSessionResponse>("/practice/session", {
    slots,
    ...(theta !== undefined ? { theta } : {}),
  });
  // One question is never shown twice in a session, even when two slots (e.g. a review slot and a practice slot) return the same item.
  if (response.items) response.items = uniqueItems(response.items);
  // Safety net: the backend can return fewer than n items for a skill; top up best-effort from the general session endpoint.
  if (response.items && response.items.length < n) {
    try {
      const fallback = await apiGet<BackendPracticeSessionResponse>(`/practice/session?size=${n - response.items.length}`);
      // A chosen technique is never padded with another technique's questions: only items of the same skill are accepted.
      const extra = isMix || isWarmup ? (fallback?.items ?? []) : (fallback?.items ?? []).filter((i) => i.skill === topic);
      if (extra.length) response.items = uniqueItems([...response.items, ...extra]);
    } catch {
      /* best-effort fallback */
    }
  }
  return mapBackendPracticeSession(response, { topic: isWarmup ? "Warm-up" : isMix ? "Adaptive mix" : topic, difficulty: level ? `Level ${level}` : difficulty, domain });
}
