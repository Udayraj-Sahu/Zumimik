import type {
  ChildFriend,
  ChildFriendAction,
  ChildFriends,
  FamilyOverview,
  FamilySeat,
  NewSeatInput,
} from "@/lib/types/family";
import { apiGet, apiPost } from "./api";
/**
 * Backend contract (services/api/app/routers/family.py, staging OpenAPI):
 *   GET  /family                          -> { family_id|null, parent_user_id, parent_tier, max_seats, seats[] }
 *   POST /family/sub-account/create       { email, password(8-128), display_name?, age(8-17) } -> { family_id, seat, seats, quote }
 *        402 "family seats need a live paid subscription" · 409 family full / email registered / child already seated · 403 child account
 *   POST /family/sub-account/override     { child_user_id, status: "active"|"suspended" } -> { family_id, seats }
 *   POST /family/sub-account/remove       { child_user_id } -> { family_id, seats, quote }
 *   GET  /family/friends/{child_user_id}  -> { child_user_id, friends[], awaiting_your_approval[], awaiting_the_other_side[] }
 *   POST /family/friends/request          { child_user_id, email } (404 no such learner, 409 already exists)
 *   POST /family/friends/respond          { friendship_id, action: "approve"|"decline"|"block" } (404, 410 expired)
 *   POST /family/friends/revoke           { friendship_id } (404)
 */
type BackendSeat = {
  seat_number: number;
  status: string;
  discount_pct: number;
  child_user_id: string | null;
  email: string | null;
  display_name: string | null;
  age: number | null;
  effective_tier: string | null;
  kids_mode?: boolean;
  parental_consent_at: string | null;
};
export type BackendFamilyResponse = {
  family_id: string | null;
  parent_user_id: string;
  parent_tier: string;
  max_seats: number;
  seats: BackendSeat[];
};
type BackendChildFriend = {
  friendship_id: string;
  user_id?: string | null;
  name?: string | null;
  source?: string | null;
  requested_at?: string | null;
  approved_at?: string | null;
  parent_approved?: boolean | null;
  expires_at?: string | null;
};
export type BackendChildFriendsResponse = {
  child_user_id: string;
  friends: BackendChildFriend[];
  awaiting_your_approval: BackendChildFriend[];
  awaiting_the_other_side: BackendChildFriend[];
};
export function mapSeat(s: BackendSeat): FamilySeat {
  return {
    seatNumber: s.seat_number,
    status: s.status,
    discountPct: s.discount_pct,
    childUserId: s.child_user_id,
    email: s.email,
    displayName: s.display_name,
    age: s.age,
    effectiveTier: s.effective_tier,
    kidsMode: s.kids_mode === true,
    parentalConsentAt: s.parental_consent_at,
  };
}
export function mapFamily(r: BackendFamilyResponse): FamilyOverview {
  return {
    familyId: r.family_id,
    parentUserId: r.parent_user_id,
    parentTier: r.parent_tier,
    maxSeats: r.max_seats,
    seats: (r.seats ?? []).map(mapSeat),
  };
}
function mapChildFriend(f: BackendChildFriend): ChildFriend {
  return {
    friendshipId: f.friendship_id,
    userId: f.user_id ?? null,
    name: f.name?.trim() || "Learner",
    source: f.source ?? null,
    requestedAt: f.requested_at ?? null,
    approvedAt: f.approved_at ?? null,
    parentApproved: f.parent_approved ?? null,
    expiresAt: f.expires_at ?? null,
  };
}
export function mapChildFriends(r: BackendChildFriendsResponse): ChildFriends {
  return {
    childUserId: r.child_user_id,
    friends: (r.friends ?? []).map(mapChildFriend),
    awaitingYourApproval: (r.awaiting_your_approval ?? []).map(mapChildFriend),
    awaitingOtherSide: (r.awaiting_the_other_side ?? []).map(mapChildFriend),
  };
}
export async function getFamily(): Promise<FamilyOverview> {
  return mapFamily(await apiGet<BackendFamilyResponse>("/family"));
}
export async function createSeat(input: NewSeatInput): Promise<FamilyOverview["seats"]> {
  const res = await apiPost<{
    seats: BackendSeat[];
  }>("/family/sub-account/create", {
    email: input.email.trim(),
    password: input.password,
    ...(input.displayName?.trim() ? { display_name: input.displayName.trim() } : {}),
    age: input.age,
  });
  return (res.seats ?? []).map(mapSeat);
}
export async function setSeatStatus(
  childUserId: string,
  status: "active" | "suspended",
): Promise<void> {
  await apiPost("/family/sub-account/override", { child_user_id: childUserId, status });
}
export async function removeSeat(childUserId: string): Promise<void> {
  await apiPost("/family/sub-account/remove", { child_user_id: childUserId });
}
export async function getChildFriends(childUserId: string): Promise<ChildFriends> {
  return mapChildFriends(
    await apiGet<BackendChildFriendsResponse>(`/family/friends/${encodeURIComponent(childUserId)}`),
  );
}
export async function requestChildFriend(childUserId: string, email: string): Promise<void> {
  await apiPost("/family/friends/request", { child_user_id: childUserId, email: email.trim() });
}
export async function respondChildFriend(
  friendshipId: string,
  action: ChildFriendAction,
): Promise<void> {
  await apiPost("/family/friends/respond", { friendship_id: friendshipId, action });
}
export async function revokeChildFriend(friendshipId: string): Promise<void> {
  await apiPost("/family/friends/revoke", { friendship_id: friendshipId });
}
