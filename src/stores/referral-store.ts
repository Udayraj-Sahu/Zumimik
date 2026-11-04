import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(name: string | undefined, length = 8): string {
  const prefix =
    name && name.trim()
      ? name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
      : "ARENA";
  let suffix = "";
  const rand = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < length; i++) rand[i] = Math.floor(Math.random() * 0xffffffff);
  }
  for (let i = 0; i < length; i++) suffix += CODE_CHARS[rand[i] % CODE_CHARS.length];
  return `${prefix}-${suffix}`;
}

type ReferralState = {
  code: string | null;
  invitesSent: number;
  friendsJoined: number;
  ensureCode: (name?: string) => void;
  markInvited: () => void;
  awardJoin: () => void;
  reset: () => void;
};

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      code: null,
      invitesSent: 0,
      friendsJoined: 0,

      ensureCode: (name) => {
        if (get().code) return;
        set({ code: generateCode(name) });
      },

      markInvited: () => set((s) => ({ invitesSent: s.invitesSent + 1 })),
      awardJoin: () => set((s) => ({ friendsJoined: s.friendsJoined + 1 })),
      reset: () => set({ code: null, invitesSent: 0, friendsJoined: 0 }),
    }),
    {
      name: "zuzumik-referral",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
