import type { Friend, FriendActivity } from "@/lib/types/friends";
import { apiGet } from "./api";
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
