import type { PairingSession, PairingApproval } from "@/lib/types/pairing";
import { apiGet, apiPost } from "./api";
import { parseSignedPairingPayload } from "./backend-adapters";
export type PairingPollInput = {
  code: string;
  pollToken: string;
  expiresAt: string;
  createdAt: string;
};
export async function createPairingSession(): Promise<PairingSession> {
  const response = await apiPost<{
    code: string;
    sig: string;
    pollToken: string;
    expiresIn: number;
  }>("/auth/scanner-login/generate");
  const createdAt = new Date().toISOString();
  return {
    sessionId: response.code,
    code: response.code,
    signature: response.sig,
    pollToken: response.pollToken,
    status: "pending",
    createdAt,
    expiresAt: new Date(Date.now() + response.expiresIn * 1000).toISOString(),
  };
}
export async function pollPairingStatus(input: string | PairingPollInput): Promise<PairingSession> {
  if (typeof input === "string") throw new Error("Pairing poll token is missing");
  const query = new URLSearchParams({ code: input.code, pollToken: input.pollToken });
  const response = await apiGet<{
    status: "pending" | "approved";
    user?: PairingSession["user"];
    token?: string;
    refreshToken?: string;
  }>(`/auth/scanner-login/poll?${query}`);
  return {
    sessionId: input.code,
    code: input.code,
    status: response.status,
    expiresAt: input.expiresAt,
    createdAt: input.createdAt,
    ...(response.user ? { user: response.user } : {}),
    ...(response.token ? { token: response.token } : {}),
    ...(response.refreshToken ? { refreshToken: response.refreshToken } : {}),
  };
}
export async function scanPairingCode(code: string): Promise<boolean> {
  return parseSignedPairingPayload(code) !== null;
}
export async function approvePairing(code: string): Promise<PairingApproval> {
  const payload = parseSignedPairingPayload(code);
  if (!payload) throw new Error("Paste the signed pairing payload from the web screen.");
  await apiPost<{
    status: "approved";
  }>("/auth/scanner-login/verify", payload);
  return { status: "approved" };
}
