import { apiGet, apiPost } from "./api";

/**
 * Clubs = the backend's virtual hubs (flag `virtual_hubs`). `/clubs/*` and `/hub/*` are the same routes; the app uses /clubs.
 *   GET  /clubs?q&city&limit          -> { hubs: [{ hub_id, name, hub_type, city, is_active, members }] }
 *   GET  /clubs/mine                  -> { hubs: [{ ...same, your_role }] }
 *   POST /clubs/create                -> the hub + your_role "owner"
 *   POST /clubs/{id}/join | /leave    -> the hub + your_role | { hub_id, left: true }
 *   GET  /clubs/{id}                  -> the hub + your_role (null when you are not in it) + has_place
 *   GET  /clubs/{id}/leaderboard      -> { hub_id, window_days: 7, leaderboard: [{ rank, user_id, display_name, weekly_xp }] }
 *                                        members only: a non-member gets 403. A child's row is anonymous to others (no user_id).
 * Public fields only: name, type, city, member count. A child account cannot create or join (the server refuses with a message).
 * The backend has no moderator, cover image, description or last-activity, so none are shown.
 */
export const HUB_TYPES = ["city", "society", "school", "college", "cafe"] as const;
export type HubType = (typeof HUB_TYPES)[number];

export type Club = {
  hub_id: string;
  name: string;
  hub_type: HubType | string;
  city: string | null;
  is_active: boolean;
  members: number;
  your_role?: string | null;
};

export async function searchClubs(params: { q?: string; city?: string; limit?: number } = {}): Promise<Club[]> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.city?.trim()) qs.set("city", params.city.trim());
  qs.set("limit", String(Math.min(50, Math.max(1, params.limit ?? 20))));
  const res = await apiGet<{ hubs?: Club[] }>(`/clubs?${qs.toString()}`);
  return Array.isArray(res?.hubs) ? res.hubs : [];
}

export type ClubDetail = Club & { has_place?: boolean };

export type ClubLeaderboardRow = { rank: number; user_id?: string | null; display_name: string; weekly_xp: number };
export type ClubLeaderboard = { hub_id: string; window_days: number; leaderboard: ClubLeaderboardRow[] };

export async function getClub(hubId: string): Promise<ClubDetail> {
  return apiGet<ClubDetail>(`/clubs/${encodeURIComponent(hubId)}`);
}

export async function getClubLeaderboard(hubId: string): Promise<ClubLeaderboard> {
  const res = await apiGet<Partial<ClubLeaderboard>>(`/clubs/${encodeURIComponent(hubId)}/leaderboard`);
  return { hub_id: res?.hub_id ?? hubId, window_days: res?.window_days ?? 7, leaderboard: Array.isArray(res?.leaderboard) ? res.leaderboard : [] };
}

export async function getMyClubs(): Promise<Club[]> {
  const res = await apiGet<{ hubs?: Club[] }>("/clubs/mine");
  return Array.isArray(res?.hubs) ? res.hubs : [];
}

/** `latitude`/`longitude` are where the club physically is: hub check-in (double XP) matches a learner standing within 20 m of them. */
export type CreateClubInput = { name: string; hub_type: HubType; city?: string; latitude?: number; longitude?: number };

export async function createClub(input: CreateClubInput): Promise<Club> {
  const city = input.city?.trim();
  const hasPlace = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  return apiPost<Club>("/clubs/create", {
    name: input.name.trim(),
    hub_type: input.hub_type,
    ...(city ? { city } : {}),
    ...(hasPlace ? { latitude: input.latitude, longitude: input.longitude } : {}),
  });
}

export async function joinClub(hubId: string): Promise<Club> {
  return apiPost<Club>(`/clubs/${encodeURIComponent(hubId)}/join`);
}

export async function leaveClub(hubId: string): Promise<void> {
  await apiPost(`/clubs/${encodeURIComponent(hubId)}/leave`);
}
