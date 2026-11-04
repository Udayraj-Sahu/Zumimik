import type { Auth, GoogleAuthProvider } from "firebase/auth";

let authInstance: Auth | null = null;
let providerInstance: GoogleAuthProvider | null = null;
let initPromise: Promise<void> | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

async function ensureInitialized() {
  if (authInstance) return;
  if (initPromise) return initPromise;
  if (typeof window === "undefined") return;
  initPromise = (async () => {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, GoogleAuthProvider: G } = await import("firebase/auth");
    const app = !getApps().length ? initializeApp(config) : getApps()[0];
    authInstance = getAuth(app);
    providerInstance = new G();
  })();
  return initPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  await ensureInitialized();
  return authInstance!;
}

export async function getFirebaseGoogleProvider(): Promise<GoogleAuthProvider> {
  await ensureInitialized();
  return providerInstance!;
}
