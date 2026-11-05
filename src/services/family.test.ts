import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapChildFriends, mapFamily } from "./family";

describe("family response mapping (shapes verified live on staging)", () => {
  it("a new account: family_id null, no seats", () => {
    // Exact shape GET /api/v1/family returned for the test account.
    expect(mapFamily({ family_id: null, parent_user_id: "p", parent_tier: "free", max_seats: 3, seats: [] })).toEqual({
      familyId: null, parentUserId: "p", parentTier: "free", maxSeats: 3, seats: [],
    });
  });

  it("maps a seat and treats a missing kids_mode as false", () => {
    const { seats } = mapFamily({
      family_id: "f", parent_user_id: "p", parent_tier: "pro", max_seats: 3,
      seats: [{ seat_number: 2, status: "suspended", discount_pct: 80, child_user_id: "c", email: "e@x.com", display_name: null, age: 15, effective_tier: "free", parental_consent_at: null }],
    });
    expect(seats[0]).toEqual({
      seatNumber: 2, status: "suspended", discountPct: 80, childUserId: "c", email: "e@x.com", displayName: null, age: 15,
      effectiveTier: "free", kidsMode: false, parentalConsentAt: null,
    });
  });

  it("child friends: names default to 'Learner' (the backend hides the name of a request the child sent) and groups are kept apart", () => {
    const r = mapChildFriends({
      child_user_id: "c",
      friends: [{ friendship_id: "a", user_id: "u", name: "Sam", parent_approved: true }],
      awaiting_your_approval: [{ friendship_id: "b", name: "  ", expires_at: "2026-12-01" }],
      awaiting_the_other_side: [{ friendship_id: "c" }],
    });
    expect(r.friends[0]).toMatchObject({ friendshipId: "a", name: "Sam", parentApproved: true });
    expect(r.awaitingYourApproval[0]).toMatchObject({ friendshipId: "b", name: "Learner", expiresAt: "2026-12-01" });
    expect(r.awaitingOtherSide[0]).toMatchObject({ friendshipId: "c", name: "Learner", userId: null });
  });
});

describe("dashboard entry point", () => {
  it("the Family tile links to /dashboard/family (it used to link to /dashboard, a dead end)", () => {
    const src = readFileSync("src/app/(app)/dashboard/page.tsx", "utf8");
    const tile = src.split("\n").find((l) => l.includes('label: "Family"'));
    expect(tile).toContain('href: "/dashboard/family"');
  });
});
