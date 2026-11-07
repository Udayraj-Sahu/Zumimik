import { apiGet, apiPost } from "./api";
/**
 * GET /api/v1/referral (feature flag `referral_ladder`) — the learner's server-issued referral code and ladder.
 * Only the fields the app uses are typed here.
 */
export type BackendReferralRung = {
  threshold: number;
  name: string;
  capability?: string;
  tier?: string | null;
  reached?: boolean;
  granted?: boolean;
  active?: boolean;
  expires_at?: string | null;
};
export type BackendReferralStatus = {
  code: string;
  verified_referrals: number;
  by_status?: Record<string, number>;
  rungs?: BackendReferralRung[];
  next_rung?: {
    threshold: number;
    name: string;
    remaining: number;
  } | null;
  claimable?: {
    threshold: number;
    name: string;
  } | null;
  cooldown_clear?: boolean;
  last_reward_at?: string | null;
};
export type ReferralRung = {
  threshold: number;
  name: string;
  reached: boolean;
  granted: boolean;
  expiresAt: string | null;
};
export type ReferralStatus = {
  code: string;
  verifiedReferrals: number;
  /** The reward ladder, lowest rung first (15 / 30 / 45 / 60 verified referrals on staging). */
  rungs: ReferralRung[];
  nextRung: {
    threshold: number;
    name: string;
    remaining: number;
  } | null;
  /** The rung the server says can be claimed right now, else null. */
  claimable: {
    threshold: number;
    name: string;
  } | null;
};
export async function getReferralStatus(): Promise<ReferralStatus | null> {
  const res = await apiGet<BackendReferralStatus>("/referral");
  return {
    code: res.code,
    verifiedReferrals: res.verified_referrals ?? 0,
    rungs: (res.rungs ?? [])
      .filter((r) => typeof r?.threshold === "number" && typeof r?.name === "string")
      .map((r) => ({
        threshold: r.threshold,
        name: r.name,
        reached: r.reached === true,
        granted: r.granted === true,
        expiresAt: r.expires_at ?? null,
      }))
      .sort((a, b) => a.threshold - b.threshold),
    nextRung: res.next_rung ?? null,
    claimable: res.claimable ?? null,
  };
}
export type ClaimedReward = {
  name: string;
  threshold: number;
  capability: string | null;
  expiresAt: string | null;
};
/**
 * POST /api/v1/referral/claim (no body) -> { claimed: { threshold, name, capability, tier, expires_at }, ...the new status }.
 * Claims the rung the server says is due. 409 "no rung is due" / "that rung is already granted"; 429 when a reward was claimed
 * within the cooldown window (the message says when the next is available). The server's message is surfaced as is.
 */
export async function claimReferralReward(): Promise<ClaimedReward> {
  const res = await apiPost<{
    claimed?: {
      name?: string;
      threshold?: number;
      capability?: string | null;
      expires_at?: string | null;
    };
  }>("/referral/claim");
  const c = res?.claimed;
  if (!c || typeof c.name !== "string" || typeof c.threshold !== "number")
    throw new Error("The server did not confirm the reward.");
  return {
    name: c.name,
    threshold: c.threshold,
    capability: c.capability ?? null,
    expiresAt: c.expires_at ?? null,
  };
}
// ── Invite link: https://<app>/?ref=<CODE> ──────────────────────────────────────────────────────────────────────
// The backend has no invite-link route: the link is just the app URL carrying the learner's referral code. A friend who opens it
// and then REGISTERS binds the new account to the referrer with POST /api/v1/referral/redeem { code } (needs a session, so it runs
// right after sign-up; flag `referral_ladder`). It grants nothing now: the server verifies the referral later.
const PENDING_REF_KEY = "zuzumik-pending-ref";
const REF_PATTERN = /^[A-Za-z0-9]{4,16}$/; // RedeemRequest.code is 4-16 characters; the server upper-cases it
/** Remember a `?ref=` code from the landing URL until the visitor registers. Anything that is not a plausible code is ignored. */
export function capturePendingReferral(search?: string): void {
  try {
    const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
    const ref = new URLSearchParams(query).get("ref")?.trim();
    if (ref && REF_PATTERN.test(ref)) localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase());
  } catch {}
}
export function readPendingReferral(): string | null {
  try {
    return localStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}
export function clearPendingReferral(): void {
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {}
}
/**
 * POST /referral/redeem { code } for the code captured from the invite link. One attempt, then the code is dropped whatever the
 * outcome, so it can never be applied to an account that did not just register. Never throws: a failed or refused redeem (unknown
 * code, 409 "cannot be accepted", feature off, offline) must not break sign-up. Returns whether the server accepted it.
 */
export async function redeemPendingReferral(): Promise<boolean> {
  const code = readPendingReferral();
  if (!code) return false;
  clearPendingReferral();
  try {
    await apiPost("/referral/redeem", { code });
    return true;
  } catch {
    return false;
  }
}
