import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPost } from "./api";

vi.mock("./api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

const mockedPost = vi.mocked(apiPost);

describe("invite link (?ref=CODE) -> POST /referral/redeem", () => {
  beforeEach(() => {
    mockedPost.mockReset();
    localStorage.clear();
  });

  it("captures a plausible code, upper-cased, and ignores anything else", async () => {
    const { capturePendingReferral, readPendingReferral } = await import("./referral");
    capturePendingReferral("?ref=abcd1234");
    expect(readPendingReferral()).toBe("ABCD1234");
    localStorage.clear();
    for (const bad of ["?ref=", "?ref=ab", "?ref=a b c d", "?ref=<script>", "?ref=" + "A".repeat(17), "?other=1"]) {
      capturePendingReferral(bad);
      expect(readPendingReferral()).toBeNull();
    }
  });

  it("redeems once with the server route, then forgets the code", async () => {
    const { capturePendingReferral, redeemPendingReferral, readPendingReferral } = await import("./referral");
    capturePendingReferral("?ref=ZXCV9876");
    mockedPost.mockResolvedValueOnce({} as never);
    await expect(redeemPendingReferral()).resolves.toBe(true);
    expect(mockedPost).toHaveBeenCalledWith("/referral/redeem", { code: "ZXCV9876" });
    expect(readPendingReferral()).toBeNull();
    await expect(redeemPendingReferral()).resolves.toBe(false); // nothing left to apply
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("a refused or failed redeem never throws and still drops the code", async () => {
    const { capturePendingReferral, redeemPendingReferral, readPendingReferral } = await import("./referral");
    capturePendingReferral("?ref=ZXCV9876");
    mockedPost.mockRejectedValueOnce(new Error("this referral cannot be accepted"));
    await expect(redeemPendingReferral()).resolves.toBe(false);
    expect(readPendingReferral()).toBeNull();
  });
});
