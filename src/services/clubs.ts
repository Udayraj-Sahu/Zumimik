import { apiGet, apiPost } from "./api";

/**
 * Clubs = the backend's virtual hubs (flag `virtual_hubs`). `/clubs/*` and `/hub/*` are the same routes; the app uses /clubs.
 *   GET  /clubs/search?q&city&limit   -> { hubs: [{ hub_id, name, hub_type, city, is_active, members }] }
 *   GET  /clubs/mine                  -> { hubs: [{ ...same, your_role }] }
 *   POST /clubs/create                -> the hub + your_role "owner"
 *   POST /clubs/{id}/join | /leave    -> the hub + your_role | { hub_id, left: true }
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
  const res = await apiGet<{ hubs?: Club[] }>(`/clubs/search?${qs.toString()}`);
  return Array.isArray(res?.hubs) ? res.hubs : [];
}

export async function getMyClubs(): Promise<Club[]> {
  const res = await apiGet<{ hubs?: Club[] }>("/clubs/mine");
  return Array.isArray(res?.hubs) ? res.hubs : [];
}

export type CreateClubInput = { name: string; hub_type: HubType; city?: string };

export async function createClub(input: CreateClubInput): Promise<Club> {
  const city = input.city?.trim();
  return apiPost<Club>("/clubs/create", { name: input.name.trim(), hub_type: input.hub_type, ...(city ? { city } : {}) });
}

export async function joinClub(hubId: string): Promise<Club> {
  return apiPost<Club>(`/clubs/${encodeURIComponent(hubId)}/join`);
}

export async function leaveClub(hubId: string): Promise<void> {
  await apiPost(`/clubs/${encodeURIComponent(hubId)}/leave`);
}
