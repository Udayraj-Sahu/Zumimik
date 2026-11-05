/**
 * Session allocator — 60/20/20 primary/sinking/frontier with persona and
 * behavioral-cluster overrides and the SHARED_REFERENCE §9.3 empty-bucket
 * redistribution. Counts use largest-remainder rounding so they always sum
 * to the requested session size.
 */
import {
  AllocationPercentages,
  BASE_ALLOCATION,
  PERSONA_ALLOCATIONS,
  CLUSTER_ALLOCATIONS,
  AGE_TIME_MULTIPLIERS,
  BASE_TIME_SECONDS,
} from "./constants";
import type { SessionAllocation } from "@vmsg/shared-types";

export function allocationPercentages(persona?: string, cluster?: string): AllocationPercentages {
  if (cluster && CLUSTER_ALLOCATIONS[cluster]) return { ...CLUSTER_ALLOCATIONS[cluster] };
  if (persona && PERSONA_ALLOCATIONS[persona]) return { ...PERSONA_ALLOCATIONS[persona] };
  return { ...BASE_ALLOCATION };
}

/** SHARED_REFERENCE §9.3 — fluid check first, then fragile check. */
export function redistribute(
  pcts: AllocationPercentages,
  hasFluid: boolean,
  hasFragile: boolean,
): AllocationPercentages {
  const out = { ...pcts };
  if (!hasFluid) {
    out.primary = 0;
    out.sinking += 0.3;
    out.frontier += 0.3;
  }
  if (!hasFragile) {
    out.sinking = 0;
    out.primary += 0.1;
    out.frontier += 0.1;
  }
  return out;
}

/** Largest-remainder apportionment over (possibly non-normalized) weights. */
function apportion(size: number, weights: AllocationPercentages): SessionAllocation {
  const entries = [
    ["primary", weights.primary],
    ["sinking", weights.sinking],
    ["frontier", weights.frontier],
  ] as const;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return { primary: 0, sinking: 0, frontier: size };

  const exact = entries.map(([k, w]) => [k, (w / total) * size] as const);
  const floors = exact.map(([k, v]) => [k, Math.floor(v), v - Math.floor(v)] as const);
  let assigned = floors.reduce((s, [, f]) => s + f, 0);
  const result: Record<string, number> = Object.fromEntries(floors.map(([k, f]) => [k, f]));
  const byRemainder = [...floors].sort((a, b) => b[2] - a[2]);
  for (const [k] of byRemainder) {
    if (assigned >= size) break;
    result[k] += 1;
    assigned += 1;
  }
  return { primary: result.primary, sinking: result.sinking, frontier: result.frontier };
}

export interface ComposeAllocationOptions {
  persona?: string;
  cluster?: string;
  hasFluid?: boolean;
  hasFragile?: boolean;
  /** Whether the frontier pool has anything in it. Defaults to true. */
  hasFrontier?: boolean;
}

/**
 * Slot counts per bucket. Every bucket whose pool is empty gets weight 0 AFTER
 * the §9.3 redistribution, and the counts are apportioned over what is left;
 * when every pool is empty, everything goes to frontier
 * (vedic_speed_gym_backend.md:592).
 *
 * Why the zeroing: §9.3 alone does not account for both buckets being empty at
 * once. A brand-new learner has no fluid and no fragile skill, and
 * `redistribute(base, false, false)` = {0.1, 0, 0.6} gave 3 primary slots of 20
 * that nothing could fill, so the learner was served 17
 * (TEST_REPORT_2026-10-05_wave1.md:49). The spec's own V5.1 guard
 * (vedic_speed_gym_backend.md:543-593) still leaks int(20·0.1) = 2 of them.
 */
export function composeAllocation(sessionSize: number, opts: ComposeAllocationOptions = {}): SessionAllocation {
  const hasFluid = opts.hasFluid ?? true;
  const hasFragile = opts.hasFragile ?? true;
  const hasFrontier = opts.hasFrontier ?? true;
  const pcts = redistribute(allocationPercentages(opts.persona, opts.cluster), hasFluid, hasFragile);
  return apportion(sessionSize, {
    primary: hasFluid ? pcts.primary : 0,
    sinking: hasFragile ? pcts.sinking : 0,
    frontier: hasFrontier ? pcts.frontier : 0,
  });
}

export function ageTimeMultiplier(age: number): number {
  for (const { min, max, multiplier } of AGE_TIME_MULTIPLIERS) {
    if (age >= min && age <= max) return multiplier;
  }
  return age < 8 ? 2.5 : 2.0;
}

export function targetTimeSeconds(age: number, base: number = BASE_TIME_SECONDS): number {
  return Math.round(base * ageTimeMultiplier(age));
}
