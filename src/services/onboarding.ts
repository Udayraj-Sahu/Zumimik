import { apiGet, apiPatch } from "./api";
import { IS_MOCK } from "@/lib/platform";
import { useAuthStore, type User } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

/**
 * Onboarding persistence over the backend's documented profile contract (staging OpenAPI):
 *   GET   /api/v1/auth/me  -> { user: { id, name, email, role, tier, isOnboarded, persona, goal, targetExam, firstName,
 *                                        triggers, sex, dob, temporalWindow, activePreps, behavioral_profile } }   (camelCase)
 *   PATCH /api/v1/auth/me  <- UpdateProfileRequest, every field optional/nullable                                   (snake_case)
 *                          -> 200 { user } | 422 on invalid JSON types
 *
 * The backend's null/empty-value semantics are NOT documented. So a PATCH only ever carries values the learner actually
 * has: never null, "" or [] — an empty default can therefore never overwrite saved data, whatever the server does with them.
 */

/** The server user: any field may be null (the live backend returns name: null for a new account). */
export type ServerUser = { [K in keyof User]?: User[K] | null };

export type OnboardingSnapshot = {
  name?: string | null;
  firstName?: string;
  persona?: string | null;
  goal?: string | null;
  targetExam?: string;
  triggers?: string[];
  sex?: string | null;
  dob?: { day: number; month: string; year: number } | null;
  temporalWindow?: string | null;
  activePreps?: string[];
  isOnboarded?: boolean;
};

export type ProfilePatchBody = Partial<{
  name: string;
  first_name: string;
  persona: string;
  goal: string;
  target_exam: string;
  triggers: string[];
  sex: string;
  dob: { day: number; month: string; year: number };
  temporal_window: string;
  active_preps: string[];
  is_onboarded: boolean;
}>;

const filled = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** Only meaningful values, snake_case. `is_onboarded` is sent only when true (completing is the one thing worth saying). */
export function buildProfilePatch(s: OnboardingSnapshot): ProfilePatchBody {
  const body: ProfilePatchBody = {};
  if (filled(s.name)) body.name = s.name.trim();
  if (filled(s.firstName)) body.first_name = s.firstName.trim();
  if (filled(s.persona)) body.persona = s.persona;
  if (filled(s.goal)) body.goal = s.goal;
  if (filled(s.targetExam)) body.target_exam = s.targetExam;
  if (s.triggers && s.triggers.length > 0) body.triggers = s.triggers;
  if (filled(s.sex)) body.sex = s.sex;
  if (s.dob && Number.isFinite(s.dob.day) && Number.isFinite(s.dob.year) && filled(s.dob.month)) body.dob = s.dob;
  if (filled(s.temporalWindow)) body.temporal_window = s.temporalWindow;
  if (s.activePreps && s.activePreps.length > 0) body.active_preps = s.activePreps;
  if (s.isOnboarded === true) body.is_onboarded = true;
  return body;
}

const TEMPORAL = ["this_year", "whenever", "not_sure"] as const;

function validDob(v: unknown): OnboardingSnapshot["dob"] {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return typeof o.day === "number" && typeof o.year === "number" && typeof o.month === "string" && o.month !== ""
    ? { day: o.day, month: o.month, year: o.year }
    : null;
}

/** The onboarding values the server actually has (empty/null ones are dropped, so they cannot blank local state). */
export function onboardingFromUser(user: ServerUser | null | undefined): OnboardingSnapshot {
  const out: OnboardingSnapshot = {};
  if (!user) return out;
  if (filled(user.firstName)) out.firstName = user.firstName;
  if (filled(user.name)) out.name = user.name;
  if (filled(user.persona)) out.persona = user.persona;
  if (filled(user.goal)) out.goal = user.goal;
  if (filled(user.targetExam)) out.targetExam = user.targetExam;
  if (Array.isArray(user.triggers) && user.triggers.length > 0) out.triggers = user.triggers.filter((t) => typeof t === "string");
  if (filled(user.sex)) out.sex = user.sex;
  const dob = validDob(user.dob);
  if (dob) out.dob = dob;
  if (typeof user.temporalWindow === "string" && (TEMPORAL as readonly string[]).includes(user.temporalWindow)) out.temporalWindow = user.temporalWindow;
  if (Array.isArray(user.activePreps) && user.activePreps.length > 0) out.activePreps = user.activePreps.filter((p) => typeof p === "string");
  if (typeof user.isOnboarded === "boolean") out.isOnboarded = user.isOnboarded;
  return out;
}

/**
 * Fill the onboarding store from the server user.
 *  - authoritative (right after login, when local state was just cleared): server values win and `isOnboarded` follows the server.
 *  - otherwise (session restore): the server only fills what is blank locally and can only turn `isOnboarded` ON, so an
 *    unsynced local edit is never clobbered.
 */
export function hydrateOnboardingFromUser(user: ServerUser | null | undefined, opts: { authoritative: boolean }): void {
  const s = onboardingFromUser(user);
  const store = useOnboardingStore.getState();
  const patch: Record<string, unknown> = {};
  const take = <K extends keyof OnboardingSnapshot>(key: K, current: unknown, empty: (c: unknown) => boolean, value: OnboardingSnapshot[K]) => {
    if (value === undefined) return;
    if (opts.authoritative || empty(current)) patch[key as string] = value;
  };
  take("firstName", store.firstName, (c) => !c, s.firstName);
  take("persona", store.persona, (c) => !c, s.persona);
  take("goal", store.goal, (c) => !c, s.goal);
  take("targetExam", store.targetExam, (c) => !c, s.targetExam);
  take("triggers", store.triggers, (c) => !(c as string[]).length, s.triggers);
  take("sex", store.sex, (c) => !c, s.sex);
  take("dob", store.dob, (c) => !c, s.dob);
  take("temporalWindow", store.temporalWindow, (c) => !c, s.temporalWindow as never);
  take("activePreps", store.activePreps, (c) => !(c as string[]).length, s.activePreps);
  if (s.name && !store.name) patch.name = s.name;
  if (s.isOnboarded === true) patch.isOnboarded = true;
  else if (opts.authoritative && s.isOnboarded === false) patch.isOnboarded = false;
  if (Object.keys(patch).length > 0) useOnboardingStore.setState(patch as never);
}

/** Fetch the latest profile (waits for it), keep the auth user in step, and hydrate the onboarding store. */
export async function refreshProfileFromServer(opts: { authoritative: boolean }): Promise<void> {
  if (IS_MOCK) return;
  const res = await apiGet<{ user?: ServerUser & { id: string } }>("/auth/me");
  if (!res?.user) return;
  useAuthStore.getState().syncServerUser(res.user);
  hydrateOnboardingFromUser(res.user, opts);
}

/**
 * Save onboarding to the backend. Resolves only after a 2xx; throws otherwise, so callers never mark onboarding complete
 * (or tell the user it is saved) on a failure. Mock mode keeps it local, as before.
 */
export async function saveOnboardingProfile(snapshot: OnboardingSnapshot): Promise<void> {
  if (IS_MOCK) return;
  const body = buildProfilePatch(snapshot);
  if (Object.keys(body).length === 0) return;
  const res = await apiPatch<{ user?: ServerUser & { id: string } }>("/auth/me", body);
  // Keep the signed-in user in step with what the server now holds.
  if (res?.user) useAuthStore.getState().setUser(res.user as User);
}

/**
 * Change the account name: PATCH /auth/me { name, display_name } (both are accepted by UpdateProfileRequest; the same value is sent
 * to each so precedence cannot matter). Resolves only after a 2xx, and updates the signed-in user from the response.
 * Mock mode has no server, so it stays local.
 */
export async function saveAccountName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || IS_MOCK) return;
  const res = await apiPatch<{ user?: ServerUser & { id: string } }>("/auth/me", { name: trimmed, display_name: trimmed });
  if (res?.user) useAuthStore.getState().setUser(res.user as User);
}
