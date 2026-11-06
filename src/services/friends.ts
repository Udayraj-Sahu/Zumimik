import type { Friend, FriendActivity, SentRequest } from "@/lib/types/friends";
import { parseSignedPairingPayload } from "./backend-adapters";
import { apiGet, apiPost } from "./api";
import { mapBackendFriends, type BackendFriendsResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getFriendsSummary(): Promise<{ friends: Friend[]; requests: Friend[]; sent: SentRequest[] }> {
  if (IS_MOCK) {
    const { FRIENDS, PENDING_REQUESTS } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    return { friends: FRIENDS, requests: PENDING_REQUESTS, sent: [] };
  }
  const response = await apiGet<BackendFriendsResponse>("/social/friends");
  return mapBackendFriends(response);
}

export async function getFriends(): Promise<Friend[]> {
  return (await getFriendsSummary()).friends;
}

export async function getFriendActivity(): Promise<FriendActivity[]> {
  if (IS_MOCK) {
    const { FRIEND_ACTIVITY } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
    await delay(150);
    return FRIEND_ACTIVITY;
  }
  // The backend does not expose friend activity yet.
  return [];
}

export async function getPendingRequests(): Promise<Friend[]> {
  return (await getFriendsSummary()).requests;
}

export type FriendRequestAction = "accept" | "decline";

/**
 * POST /api/v1/social/friends/respond { friendship_id, action: "accept" | "decline" | "block" } -> { friendship_id, status }.
 * (404 if there is no such pending request, 410 if it expired.) Mock mode has no server, so it is a no-op there.
 */
export async function respondToFriendRequest(friendshipId: string, action: FriendRequestAction): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/social/friends/respond", { friendship_id: friendshipId, action });
}

/**
 * POST /api/v1/social/friends/request { email } -> { friendship_id, status: "pending" }.
 * 404 "no such learner" (unknown email, or your own), 409 "a request or friendship already exists". A request to a child is held
 * for their parent and answers identically, so the UI must not claim the person has seen it. Mock mode has no server (no-op).
 */
export async function sendFriendRequest(email: string): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/social/friends/request", { email: email.trim() });
}

export type FriendQr = { code: string; sig: string; expiresIn: number };

/**
 * POST /api/v1/social/friends/qr/generate (no body) -> { code, sig, expiresIn }: a one-time, HMAC-signed code to show a friend in
 * person (expiresIn: 300 s). 404 when the social_friends feature is dark; refused for a child account. A new call makes a new code.
 * Mock mode has no server, so it returns an obvious development placeholder.
 */
export async function generateFriendQr(): Promise<FriendQr> {
  if (IS_MOCK) return { code: "MOCKFRIENDCODE01", sig: "0".repeat(64), expiresIn: 300 };
  const res = await apiPost<Partial<FriendQr> | undefined>("/social/friends/qr/generate");
  if (!res || typeof res.code !== "string" || typeof res.sig !== "string") throw new Error("The server did not return a friend code.");
  return { code: res.code, sig: res.sig, expiresIn: typeof res.expiresIn === "number" && res.expiresIn > 0 ? res.expiresIn : 300 };
}

/**
 * POST /api/v1/social/friends/qr/redeem { code, sig } -> { ...friendship, status: "accepted" }: the other person's scan. The two
 * become friends at once (no pending step). `scanned` is what the QR holds (`code.sig`, or JSON { code, sig }) or what was pasted.
 * 400 "bad signature" / "that is your own code" (your own code is NOT used up), 410 "code expired or already used". Refused for a
 * child account; 404 when the social_friends feature is dark. Mock mode has no server (no-op).
 */
export async function redeemFriendQr(scanned: string): Promise<void> {
  const payload = parseSignedPairingPayload(scanned.trim());
  if (!payload) throw new Error("That doesn't look like a friend code. Ask your friend to show a new one.");
  if (IS_MOCK) return;
  await apiPost("/social/friends/qr/redeem", { code: payload.code, sig: payload.sig });
}

/** POST /api/v1/social/friends/remove { friendship_id } -> { friendship_id, status: "removed" } (404 if there is no such friendship). */
export async function removeFriend(friendshipId: string): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/social/friends/remove", { friendship_id: friendshipId });
}
