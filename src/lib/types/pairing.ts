export type PairingStatus = "pending" | "scanned" | "approved" | "expired";

export type PairingSession = {
  sessionId: string;
  code: string;
  status: PairingStatus;
  expiresAt: string;
  createdAt: string;
  signature?: string;
  pollToken?: string;
  user?: { id: string; name: string; email: string; role: string; tier?: string };
  token?: string;
  refreshToken?: string;
};

export type PairingApproval = {
  status?: "approved";
  token?: string;
  refreshToken?: string;
  sessionId?: string;
};
