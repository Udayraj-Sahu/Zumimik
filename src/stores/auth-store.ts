import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { IS_MOCK, apiUrl } from "@/lib/platform";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginMockUser: (profile: { name: string; phone?: string }) => Promise<void>;
  loginWithFirebase: (idToken: string, method: "google" | "phone") => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User) => void;
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
          ? issue.loc.filter((part): part is string => typeof part === "string" && part !== "body").at(-1)
          : undefined;
        return [field ? `${field}: ${issue.msg}` : issue.msg];
      });
      if (messages.length) return messages.join("; ");
    }
  } catch {
    // Keep a clear fallback when the server doesn't return a JSON error body.
  }
  return fallback;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,

      login: async (email: string, _password: string) => {
        if (IS_MOCK) {
          await new Promise((r) => setTimeout(r, 300));
          set({
            user: { id: "1", name: email.split("@")[0], email, role: "Champion" },
            token: "mock-jwt-token",
            isAuthenticated: true,
          });
        } else {
          const res = await fetch(apiUrl("/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: _password }),
          });
          if (!res.ok) throw new Error(await authFailureMessage(res, "Login failed"));
          const data = await res.json();
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          });
        }
      },

      register: async (email, password, displayName) => {
        if (IS_MOCK) {
          await new Promise((r) => setTimeout(r, 300));
          set({
            user: {
              id: "1",
              name: displayName || email.split("@")[0],
              email,
              role: "Champion",
            },
            token: "mock-jwt-token",
            isAuthenticated: true,
          });
          return;
        }

        const res = await fetch(apiUrl("/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, display_name: displayName }),
        });
        if (!res.ok) throw new Error(await authFailureMessage(res, "Registration failed"));
        const data = await res.json();
        set({
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      loginMockUser: async ({ name, phone }) => {
        if (!IS_MOCK) throw new Error("Mock sign-in is disabled. Use email and password instead.");
        await new Promise((r) => setTimeout(r, 300));
        const localPart = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "user";
        set({
          user: {
            id: "1",
            name,
            email: `${localPart}@mock.local`,
            role: "Champion",
            ...(phone ? { phone } : {}),
          },
          token: "mock-jwt-token",
          refreshToken: null,
          isAuthenticated: true,
        });
      },

      loginWithFirebase: async (idToken: string, method: "google" | "phone") => {
        if (IS_MOCK) {
          await new Promise((r) => setTimeout(r, 300));
          const name = method === "google" ? "Firebase User" : "Phone User";
          set({
            user: { id: "1", name, email: `${name}@firebase.com`, role: "Champion" },
            token: "mock-firebase-token",
            isAuthenticated: true,
          });
        } else {
          const res = await fetch(apiUrl(`/auth/${method}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (!res.ok) throw new Error(await authFailureMessage(res, "Firebase auth failed"));
          const data = await res.json();
          set({ user: data.user, token: data.token, refreshToken: data.refreshToken, isAuthenticated: true });
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
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
