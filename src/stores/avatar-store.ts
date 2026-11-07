import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";

/**
 * The learner's profile photo, kept on this device only: the backend has no avatar field. Keyed by user id so one device can hold
 * several accounts. A photo is a small square JPEG data URL (see resizeAvatar).
 */
type AvatarState = {
  photos: Record<string, string>;
  setPhoto: (userId: string, dataUrl: string) => void;
  removePhoto: (userId: string) => void;
};

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      photos: {},
      setPhoto: (userId, dataUrl) => set((s) => ({ photos: { ...s.photos, [userId]: dataUrl } })),
      removePhoto: (userId) =>
        set((s) => {
          const { [userId]: _gone, ...rest } = s.photos;
          return { photos: rest };
        }),
    }),
    { name: "zuzumik-avatar", storage: createJSONStorage(() => safeLocalStorage) },
  ),
);

/** The signed-in learner's photo, or undefined (show initials). */
export function useMyAvatar(): string | undefined {
  const id = useAuthStore((s) => s.user?.id);
  return useAvatarStore((s) => (id ? s.photos[id] : undefined));
}
