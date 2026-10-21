import type { Friend, FriendActivity } from "@/lib/types/friends";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getFriends(): Promise<Friend[]> {
  if (IS_MOCK) {
    const { FRIENDS, FRIEND_ACTIVITY, PENDING_REQUESTS } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
 await delay(200); return FRIENDS; }
  return apiGet<Friend[]>("/friends");
}

export async function getFriendActivity(): Promise<FriendActivity[]> {
  if (IS_MOCK) {
    const { FRIENDS, FRIEND_ACTIVITY, PENDING_REQUESTS } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
 await delay(150); return FRIEND_ACTIVITY; }
  return apiGet<FriendActivity[]>("/friends/activity");
}

export async function getPendingRequests(): Promise<Friend[]> {
  if (IS_MOCK) {
    const { FRIENDS, FRIEND_ACTIVITY, PENDING_REQUESTS } = await import("@/lib/mock/friends");
    const { delay } = await import("@/lib/mock/delay");
 await delay(100); return PENDING_REQUESTS; }
  return apiGet<Friend[]>("/friends/requests");
}
