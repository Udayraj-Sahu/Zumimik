export function getWindowWidth(fallback = 1024): number {
  if (typeof window === "undefined") return fallback;
  return window.innerWidth;
}

export function getWindowHeight(fallback = 768): number {
  if (typeof window === "undefined") return fallback;
  return window.innerHeight;
}

function createSafeStorage(getStorage: () => Storage): Storage {
  return {
    getItem(key: string): string | null {
      try { return getStorage().getItem(key); } catch { return null; }
    },
    setItem(key: string, value: string): void {
      try { getStorage().setItem(key, value); } catch { }
    },
    removeItem(key: string): void {
      try { getStorage().removeItem(key); } catch { }
    },
    clear(): void {
      try { getStorage().clear(); } catch { }
    },
    get length(): number {
      try { return getStorage().length; } catch { return 0; }
    },
    key(index: number): string | null {
      try { return getStorage().key(index); } catch { return null; }
    },
  };
}

export const safeLocalStorage: Storage = createSafeStorage(() => localStorage);

export const safeSessionStorage: Storage = createSafeStorage(() => sessionStorage);

export function createAudioContext(): AudioContext | null {
  try { return new AudioContext(); } catch { return null; }
}

