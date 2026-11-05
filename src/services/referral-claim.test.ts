import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock("./api", () => ({ apiGet: (...a: unknown[]) => apiGet(...a), apiPost: (...a: unknown[]) => apiPost(...a) }));
vi.mock("@/lib/platform", () => ({ IS_MOCK: false }));

const RUNG = (threshold: number, name: string, over: Record<string, unknown> = {}) => ({
  threshold, name, capability: "x", tier: null, reached: false, granted: false, active: false, grant_months: null, expires_at: null, ...over,
});

describe("referral ladder and claim", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  it("maps the server's ladder, lowest rung first, with the next and claimable rungs", async () => {
    const { getReferralStatus } = await import("./referral");
    apiGet.mockResolvedValue({
      code: "ABCD1234",
      verified_referrals: 16,
      by_status: {},
      rungs: [RUNG(30, "Offline queue"), RUNG(15, "+1 exam lane", { reached: true }), { bad: true }],
      next_rung: { threshold: 30, name: "Offline queue", remaining: 14 },
      claimable: { threshold: 15, name: "+1 exam lane" },
      cooldown_clear: true,
    });
    const s = await getReferralStatus();
    expect(s?.verifiedReferrals).toBe(16);
    expect(s?.rungs.map((r) => r.threshold)).toEqual([15, 30]); // sorted; the malformed entry is dropped
    expect(s?.rungs[0]).toMatchObject({ name: "+1 exam lane", reached: true, granted: false });
    expect(s?.nextRung).toEqual({ threshold: 30, name: "Offline queue", remaining: 14 });
    expect(s?.claimable).toEqual({ threshold: 15, name: "+1 exam lane" });
  });

  it("a status without a ladder still maps (no rungs, nothing claimable)", async () => {
    const { getReferralStatus } = await import("./referral");
    apiGet.mockResolvedValue({ code: "ABCD1234", verified_referrals: 0 });
    expect(await getReferralStatus()).toMatchObject({ rungs: [], nextRung: null, claimable: null });
  });

  it("claims with POST /referral/claim and returns the reward the server confirmed", async () => {
    const { claimReferralReward } = await import("./referral");
    apiPost.mockResolvedValue({ claimed: { threshold: 15, name: "+1 exam lane", capability: "extra_lane", tier: null, expires_at: "2027-01-01T00:00:00Z" }, code: "X" });
    const c = await claimReferralReward();
    expect(apiPost).toHaveBeenCalledWith("/referral/claim");
    expect(c).toEqual({ name: "+1 exam lane", threshold: 15, capability: "extra_lane", expiresAt: "2027-01-01T00:00:00Z" });
  });

  it("an answer without a confirmed reward is an error, not a success", async () => {
    const { claimReferralReward } = await import("./referral");
    apiPost.mockResolvedValue({});
    await expect(claimReferralReward()).rejects.toThrow("did not confirm");
  });
});
