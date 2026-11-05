import { apiGet } from "./api";
import { IS_MOCK } from "@/lib/platform";
import { ApiError } from "./api";

/**
 * GET /api/config (public): { flags: { <name>: { enabled, rollout_pct } }, degraded }.
 * A dark feature's routes answer 404 "not found" on purpose (the backend never confirms what is dark-launched), so a bare 404 cannot
 * be told apart from a missing route. The flag list can: `enabled: false` (or 0% rollout) means the feature is definitely off.
 * `enabled: true` with a partial rollout is per-user and cannot be decided here, so it is treated as "maybe on".
 */
export type FeatureFlag = { enabled: boolean; rolloutPct: number };
export type FeatureFlags = Record<string, FeatureFlag>;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (IS_MOCK) return {}; // fixtures are not gated
  const res = await apiGet<{ flags?: Record<string, { enabled?: boolean; rollout_pct?: number }> }>("/api/config");
  const out: FeatureFlags = {};
  for (const [name, f] of Object.entries(res.flags ?? {})) out[name] = { enabled: f?.enabled === true, rolloutPct: typeof f?.rollout_pct === "number" ? f.rollout_pct : 0 };
  return out;
}

/** True only when the flag list is loaded AND says the feature is off for everyone. Unknown or not-yet-loaded is never "off". */
export function isFeatureOff(flags: FeatureFlags | undefined, name: string): boolean {
  const f = flags?.[name];
  return !!f && (!f.enabled || f.rolloutPct <= 0);
}

/** A clear message for a 404 on a feature-gated route; anything else keeps its own message. */
export function gatedFeatureMessage(error: unknown, feature: string): string | null {
  if (error instanceof ApiError && error.status === 404 && /not found/i.test(error.message)) {
    return `${feature} isn't enabled for your account yet.`;
  }
  return null;
}
