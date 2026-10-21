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
  loginWithFirebase: (idToken: string, method: "google" | "phone") => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  completeOnboarding: () => void;
  updateUser: (patch: Partial<Pick<User, "name" | "email" | "phone">>) => void;
};

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
          if (!res.ok) throw new Error("Login failed");
          const data = await res.json();
          set({ user: data.user, token: data.token, isAuthenticated: true });
        }
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
          if (!res.ok) throw new Error("Firebase auth failed");
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
