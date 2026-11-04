import type { PairingSession, PairingStatus, PairingApproval } from "@/lib/types/pairing";

const MOCK_TOKEN = "mock-paired-web-session";
const MOCK_REFRESH = "mock-paired-refresh-token";
const SESSION_TTL_MS = 120_000; // 120s

type MockSession = {
  code: string;
  status: PairingStatus;
  expiresAt: number;
};

const sessions = new Map<string, MockSession>();

function generateId(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function mockCreateSession(): PairingSession {
  const sessionId = generateId();
  const code = generateCode();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(sessionId, { code, status: "pending", expiresAt });
  return {
    sessionId,
    code,
    status: "pending",
    expiresAt: new Date(expiresAt).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export function mockGetSession(sessionId: string): PairingSession | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt && s.status !== "approved") {
    s.status = "expired";
  }
  return {
    sessionId,
    code: s.code,
    status: s.status,
    expiresAt: new Date(s.expiresAt).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function findSessionIdByCode(code: string): string | null {
  const norm = code.toUpperCase();
  for (const [id, s] of sessions.entries()) {
    if (s.code === norm) return id;
  }
  return null;
}

export function mockScanSession(code: string): boolean {
  // The app only knows the pairing code — resolve the real session from it.
  const realId = findSessionIdByCode(code);
  if (!realId) return false;
  const s = sessions.get(realId);
  if (!s) return false;
  if (s.status !== "pending") return false;
  if (s.code !== code.toUpperCase()) return false;
  if (Date.now() > s.expiresAt) { s.status = "expired"; return false; }
  s.status = "scanned";
  return true;
}

export function mockApproveSession(code: string): PairingApproval | null {
  const realId = findSessionIdByCode(code);
  if (!realId) return null;
  const s = sessions.get(realId);
  if (!s) return null;
  if (s.code !== code.toUpperCase()) return null;
  if (Date.now() > s.expiresAt) { s.status = "expired"; return null; }
  s.status = "approved";
  return { token: MOCK_TOKEN, refreshToken: MOCK_REFRESH, sessionId: realId };
}

export function mockRevokeSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function mockListSessions(): Array<{ sessionId: string; status: PairingStatus; expiresAt: string }> {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    sessionId: id,
    status: s.status,
    expiresAt: new Date(s.expiresAt).toISOString(),
  }));
}
