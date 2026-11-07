import { useTourStore } from "@/stores/tour-store";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { apiUrl } from "@/lib/platform";
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  /** Backend users.tier (additive on the /auth/* user shape). */
  tier?: string | null;
  // Onboarding profile as returned by login and GET /auth/me (camelCase; any may be null/empty on a new account).
  isOnboarded?: boolean | null;
  persona?: string | null;
  goal?: string | null;
  targetExam?: string | null;
  firstName?: string | null;
  triggers?: string[] | null;
  sex?: string | null;
  dob?: {
    day?: number;
    month?: string;
    year?: number;
  } | null;
  temporalWindow?: string | null;
  activePreps?: string[] | null;
  behavioral_profile?: Record<string, unknown> | null;
};
/** Backend user payload: any field may be null/omitted (e.g. display_name is optional). */
export type IncomingUser = {
  id: string;
} & {
  [K in keyof Omit<User, "id">]?: User[K] | null;
};
/**
 * Combine an incoming (backend) user with the stored one. For the SAME account the stored fields
 * survive anything the incoming payload omits or sends as null/undefined (e.g. a locally edited phone).
 * With `preferStored` (background /auth/me refresh) stored values also win over incoming ones;
 * a different account replaces the stored user entirely so nothing leaks between accounts.
 */
export function mergeUser(prev: User | null, next: IncomingUser, preferStored = false): User {
  if (!prev || prev.id !== next.id) {
    return {
      ...next,
      name: next.name ?? "",
      email: next.email ?? "",
      role: next.role ?? "user",
    } as User;
  }
  const defined = Object.fromEntries(
    Object.entries(next).filter(([, v]) => v !== undefined && v !== null),
  );
  const stored = Object.fromEntries(
    Object.entries(prev).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  // preferStored: a background refresh only fills gaps, so local edits (no server update route exists) survive.
  return (preferStored ? { ...prev, ...defined, ...stored } : { ...prev, ...defined }) as User;
}
type AuthState = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithFirebase: (idToken: string, method: "google" | "phone") => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User) => void;
  /** Refresh the stored user from GET /auth/me. No-op when signed out (a late response must not re-authenticate). */
  syncServerUser: (user: IncomingUser) => void;
  completeOnboarding: () => void;
  updateUser: (patch: Partial<Pick<User, "name" | "email" | "phone">>) => void;
};
async function authFailureMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      const messages = body.detail.flatMap((issue: { loc?: unknown[]; msg?: unknown }) => {
        if (typeof issue.msg !== "string") return [];
        const field = Array.isArray(issue.loc)
          ? issue.loc
              .filter((part): part is string => typeof part === "string" && part !== "body")
              .at(-1)
          : undefined;
        return [field ? `${field}: ${issue.msg}` : issue.msg];
      });
      if (messages.length) return messages.join("; ");
    }
  } catch {}
  return fallback;
}
const AUTH_TIMEOUT_MS = 15000;
/**
 * fetch for the credential endpoints (login/register/Firebase). A network failure or timeout becomes a readable message
 * instead of the browser's raw "Failed to fetch"; HTTP errors are left to the caller. (Not api.ts: it imports this store.)
 */
async function authFetch(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? "The server took too long to respond. Please try again."
        : "Could not reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      login: async (email: string, _password: string) => {
        const res = await authFetch("/auth/login", { email, password: _password });
        if (!res.ok) throw new Error(await authFailureMessage(res, "Login failed"));
        const data = await res.json();
        set({
          user: mergeUser(get().user, data.user),
          token: data.token,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },
      register: async (email, password, displayName) => {
        const res = await authFetch("/auth/register", {
          email,
          password,
          display_name: displayName,
        });
        if (!res.ok) throw new Error(await authFailureMessage(res, "Registration failed"));
        const data = await res.json();
        useTourStore.getState().markNewAccount(data.user?.id); // the first-run walkthrough is for new accounts only
        set({
          user: mergeUser(get().user, data.user),
          token: data.token,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },
      loginWithFirebase: async (idToken: string, method: "google" | "phone") => {
        const res = await authFetch(`/auth/${method}`, { idToken });
        if (!res.ok) throw new Error(await authFailureMessage(res, "Firebase auth failed"));
        const data = await res.json();
        // Google/phone sign-in does not say whether the account is new: one that has not been onboarded yet is treated as new.
        if (data.user && !data.user.isOnboarded) useTourStore.getState().markNewAccount(data.user.id);
        set({
          user: mergeUser(get().user, data.user),
          token: data.token,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },
      logout: () => {
        const { refreshToken } = get();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        // Best-effort server-side revocation (POST /auth/logout {refreshToken}). Local sign-out never waits on it.
        if (refreshToken) {
          fetch(apiUrl("/auth/logout"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            keepalive: true,
          }).catch(() => {});
        }
      },
      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
      },
      setRefreshToken: (refreshToken) => {
        set({ refreshToken });
      },
      setUser: (user) => {
        set({ user: mergeUser(get().user, user), isAuthenticated: true });
      },
      syncServerUser: (user) => {
        if (!get().isAuthenticated) return;
        set({ user: mergeUser(get().user, user, true) });
      },
      completeOnboarding: () => {
        set({ isOnboarded: true });
      },
      updateUser: (patch) =>
        set((s) => ({
          user: s.user ? { ...s.user, ...patch } : s.user,
        })),
    }),
    {
      name: "zuzumik-auth",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
