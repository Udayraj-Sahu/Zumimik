import { apiDelete } from "./api";
import { IS_MOCK } from "@/lib/platform";

/**
 * DELETE /api/v1/auth/me (bearer) -> { status: "deleted", message }. Permanently deletes the signed-in account and its attempt data
 * on the server; there is no undo. Resolves only after a 2xx, so the caller never signs the user out of an account that still
 * exists. Mock mode has no server, so it is a no-op.
 */
export async function deleteAccount(): Promise<void> {
  if (IS_MOCK) return;
  await apiDelete("/auth/me");
}
