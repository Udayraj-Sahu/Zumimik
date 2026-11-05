import { apiGet } from "./api";

/**
 * GET /api/v1/social/policy -> safety limits for this account (kids mode, taunts, the daily session cap).
 * Only the fields the app acts on are read; anything missing is treated as "no limit reported".
 */
export type SocialPolicy = {
  kidsMode: boolean;
  tauntsEnabled: boolean;
  sessionCapEnforced: boolean;
  sessionCapMinutes: number | null;
  sessionRemainingMinutes: number | null;
};

type BackendPolicy = {
  is_kid?: boolean;
  kids_mode?: boolean;
  taunts_enabled?: boolean;
  session_cap_enforced?: boolean;
  session_cap_minutes?: number | null;
  session_cap_remaining_minutes?: number | null;
};

const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function getSocialPolicy(): Promise<SocialPolicy> {
  const res = await apiGet<BackendPolicy>("/social/policy");
  return {
    kidsMode: res.kids_mode === true || res.is_kid === true,
    tauntsEnabled: res.taunts_enabled === true,
    sessionCapEnforced: res.session_cap_enforced === true,
    sessionCapMinutes: numOrNull(res.session_cap_minutes),
    sessionRemainingMinutes: numOrNull(res.session_cap_remaining_minutes),
  };
}
