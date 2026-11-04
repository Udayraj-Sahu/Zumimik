import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPatch = vi.fn();
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
}));

const SERVER_USER = {
  id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user", tier: "free",
  isOnboarded: true, persona: "Student", goal: "Prepare for CAT", targetExam: "cat", firstName: "Ada",
  triggers: ["Commute"], sex: "female", dob: { day: 10, month: "December", year: 1990 },
  temporalWindow: "this_year", activePreps: ["cat"], behavioral_profile: {},
};
const EMPTY_USER = {
  id: "u2", name: null, email: "new@example.com", role: "user", tier: "free",
  isOnboarded: false, persona: null, goal: null, targetExam: "", firstName: "", triggers: [], sex: null,
  dob: null, temporalWindow: null, activePreps: [], behavioral_profile: {},
};

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  localStorage.clear();
  const svc = await import("@/services/onboarding");
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  const { useAuthStore } = await import("@/stores/auth-store");
  return { svc, onboarding: useOnboardingStore, auth: useAuthStore };
}

describe("buildProfilePatch: only meaningful values, snake_case", () => {
  beforeEach(() => apiPatch.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("maps frontend fields to the documented UpdateProfileRequest keys", async () => {
    const { svc } = await load();
    expect(
      svc.buildProfilePatch({
        name: "Ada", firstName: "Ada", persona: "Student", goal: "Prepare for CAT", targetExam: "cat",
        triggers: ["Commute"], sex: "female", dob: { day: 1, month: "January", year: 2000 },
        temporalWindow: "this_year", activePreps: ["cat"], isOnboarded: true,
      }),
    ).toEqual({
      name: "Ada", first_name: "Ada", persona: "Student", goal: "Prepare for CAT", target_exam: "cat",
      triggers: ["Commute"], sex: "female", dob: { day: 1, month: "January", year: 2000 },
      temporal_window: "this_year", active_preps: ["cat"], is_onboarded: true,
    });
  });

  it("never sends null, empty strings, empty arrays or false: empty defaults cannot overwrite saved data", async () => {
    const { svc } = await load();
    const body = svc.buildProfilePatch({
      name: "", firstName: "  ", persona: null, goal: null, targetExam: "", triggers: [], sex: null, dob: null,
      temporalWindow: null, activePreps: [], isOnboarded: false,
    });
    expect(body).toEqual({});
    expect(JSON.stringify(body)).not.toMatch(/null|""|\[\]|false/);
  });

  it("a partial edit sends only the edited field", async () => {
    const { svc } = await load();
    expect(svc.buildProfilePatch({ goal: "Master speed math" })).toEqual({ goal: "Master speed math" });
  });
});

describe("saveOnboardingProfile", () => {
  beforeEach(() => apiPatch.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("PATCHes /auth/me and keeps the signed-in user in step with the response", async () => {
    const { svc, auth } = await load();
    auth.setState({ user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user" }, isAuthenticated: true });
    apiPatch.mockResolvedValueOnce({ user: SERVER_USER });
    await svc.saveOnboardingProfile({ firstName: "Ada", persona: "Student", isOnboarded: true });
    expect(apiPatch).toHaveBeenCalledWith("/auth/me", { first_name: "Ada", persona: "Student", is_onboarded: true });
    expect(auth.getState().user).toMatchObject({ isOnboarded: true, persona: "Student", goal: "Prepare for CAT" });
  });

  it("rejects when the server rejects, so callers cannot mark onboarding complete", async () => {
    const { svc } = await load();
    apiPatch.mockRejectedValueOnce(new Error("Could not save"));
    await expect(svc.saveOnboardingProfile({ firstName: "Ada", isOnboarded: true })).rejects.toThrow("Could not save");
  });

  it("makes no request when there is nothing to save", async () => {
    const { svc } = await load();
    await svc.saveOnboardingProfile({ firstName: "", triggers: [] });
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it("explicit mock mode stays local: no request", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "true");
    const svc = await import("@/services/onboarding");
    await svc.saveOnboardingProfile({ firstName: "Ada", isOnboarded: true });
    expect(apiPatch).not.toHaveBeenCalled();
  });
});

describe("hydrating the onboarding form from the server user", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("login (authoritative): every saved field populates the form, and isOnboarded follows the server", async () => {
    const { svc, onboarding } = await load();
    svc.hydrateOnboardingFromUser(SERVER_USER, { authoritative: true });
    expect(onboarding.getState()).toMatchObject({
      firstName: "Ada", persona: "Student", goal: "Prepare for CAT", targetExam: "cat", triggers: ["Commute"],
      sex: "female", dob: { day: 10, month: "December", year: 1990 }, temporalWindow: "this_year",
      activePreps: ["cat"], isOnboarded: true,
    });
  });

  it("a new account (empty server values) leaves the defaults and shows onboarding", async () => {
    const { svc, onboarding } = await load();
    svc.hydrateOnboardingFromUser(EMPTY_USER, { authoritative: true });
    expect(onboarding.getState()).toMatchObject({ firstName: "", persona: null, goal: null, targetExam: "", isOnboarded: false });
  });

  it("empty/null server values never blank what is already filled", async () => {
    const { svc, onboarding } = await load();
    onboarding.setState({ firstName: "Local", persona: "Parent", triggers: ["x"] });
    svc.hydrateOnboardingFromUser(EMPTY_USER, { authoritative: true });
    expect(onboarding.getState()).toMatchObject({ firstName: "Local", persona: "Parent", triggers: ["x"] });
  });

  it("session restore (not authoritative): fills only blanks, keeps local edits, can only turn isOnboarded on", async () => {
    const { svc, onboarding } = await load();
    onboarding.setState({ persona: "Parent", goal: null, isOnboarded: false });
    svc.hydrateOnboardingFromUser(SERVER_USER, { authoritative: false });
    expect(onboarding.getState()).toMatchObject({ persona: "Parent", goal: "Prepare for CAT", isOnboarded: true });

    onboarding.setState({ isOnboarded: true });
    svc.hydrateOnboardingFromUser(EMPTY_USER, { authoritative: false });
    expect(onboarding.getState().isOnboarded).toBe(true); // server "false" does not undo an unsynced local completion
  });

  it("ignores malformed server values (bad dob / unknown temporal window)", async () => {
    const { svc, onboarding } = await load();
    svc.hydrateOnboardingFromUser({ ...SERVER_USER, dob: { day: "x" } as never, temporalWindow: "someday" }, { authoritative: true });
    expect(onboarding.getState().dob).toEqual({ day: 1, month: "January", year: 2000 }); // store default untouched
    expect(onboarding.getState().temporalWindow).toBeNull();
  });

  it("refreshProfileFromServer reads {user} from GET /auth/me, syncs the auth user and hydrates", async () => {
    const { svc, onboarding, auth } = await load();
    auth.setState({ user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user" }, isAuthenticated: true });
    apiGet.mockResolvedValueOnce({ user: SERVER_USER });
    await svc.refreshProfileFromServer({ authoritative: true });
    expect(apiGet).toHaveBeenCalledWith("/auth/me");
    expect(onboarding.getState()).toMatchObject({ persona: "Student", isOnboarded: true });
    expect(auth.getState().user).toMatchObject({ id: "u1" });
  });

  it("save, logout, login: values saved on one login are populated on the next (modelled by the server user)", async () => {
    const { svc, onboarding, auth } = await load();
    auth.setState({ user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user" }, isAuthenticated: true });
    onboarding.setState({ firstName: "Ada", persona: "Student", goal: "Prepare for CAT", targetExam: "cat" });
    apiPatch.mockResolvedValueOnce({ user: SERVER_USER });
    await svc.saveOnboardingProfile({ firstName: "Ada", persona: "Student", goal: "Prepare for CAT", targetExam: "cat", isOnboarded: true });

    // logout clears everything local (resetAppState); the next login gets the server's copy
    onboarding.getState().reset();
    expect(onboarding.getState().persona).toBeNull();
    svc.hydrateOnboardingFromUser(SERVER_USER, { authoritative: true });
    expect(onboarding.getState()).toMatchObject({ persona: "Student", goal: "Prepare for CAT", isOnboarded: true });
  });
});
