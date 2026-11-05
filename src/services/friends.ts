import type { Friend, FriendActivity } from "@/lib/types/friends";
import { apiGet, apiPost } from "./api";
import { mapBackendFriends, type BackendFriendsResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getFriendsSummary(): Promise<{ friends: Friend[]; requests: Friend[] }> {
  if (IS_MOCK) {
    const { FRIENDS, PENDING_REQUESTS } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    return { friends: FRIENDS, requests: PENDING_REQUESTS };
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

/** POST /api/v1/social/friends/remove { friendship_id } -> { friendship_id, status: "removed" } (404 if there is no such friendship). */
export async function removeFriend(friendshipId: string): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/social/friends/remove", { friendship_id: friendshipId });
}
