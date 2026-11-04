import { apiGet } from "./api";
import { IS_MOCK } from "@/lib/platform";

/**
 * GET /api/v1/referral (feature flag `referral_ladder`) — the learner's server-issued referral code and ladder.
 * Only the fields the app uses are typed here.
 */
export type BackendReferralStatus = {
  code: string;
  verified_referrals: number;
  by_status?: Record<string, number>;
  next_rung?: { threshold: number; name: string; remaining: number } | null;
  claimable?: { threshold: number; name: string } | null;
};

export type ReferralStatus = { code: string; verifiedReferrals: number };

export async function getReferralStatus(): Promise<ReferralStatus | null> {
  // Mock mode has no server; the local development code in the referral store is used instead.
  if (IS_MOCK) return null;
  const res = await apiGet<BackendReferralStatus>("/referral");
  return { code: res.code, verifiedReferrals: res.verified_referrals ?? 0 };
}
