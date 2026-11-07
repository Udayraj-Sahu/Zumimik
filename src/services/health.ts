import { API_BASE_URL } from "@/lib/platform";
import { useNetworkStore } from "@/stores/network-store";
/**
 * GET /ready (at the server root, not under /api/v1; public) says whether the API and ALL THREE of its databases answer:
 *   200 { status: "ready", checks: { postgres, neo4j, redis: "healthy" } }
 *   503 { status: "degraded", checks: { <name>: "unavailable: <reason>", ... } }   (each check waits up to 3 s)
 * It already includes what GET /health says (the process is up), so the app asks only /ready: one request, not two.
 * A 404 means an older server without the route, which says nothing about health, so it is treated as ready (no false alarm).
 * A refusal from the edge proxy (502/503 without a readiness body, 504) or no answer at all means the server cannot be reached.
 */
export type Readiness =
  | {
      state: "ready";
    }
  | {
      state: "degraded";
      failing: string[];
    }
  | {
      state: "unreachable";
    };
const TIMEOUT_MS = 10000; // three database checks of up to 3 s each, plus the network
/** The names of the checks that are not "healthy" in a /ready body, or null when the body is not a readiness report. */
function failingChecks(body: unknown): string[] | null {
  const checks = (
    body as {
      checks?: unknown;
    } | null
  )?.checks;
  if (!checks || typeof checks !== "object") return null;
  return Object.entries(checks as Record<string, unknown>)
    .filter(([, v]) => v !== "healthy")
    .map(([k]) => k);
}
export async function getReadiness(): Promise<Readiness> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/ready`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.status === 404) return { state: "ready" };
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {}
    if (res.ok)
      return failingChecks(body)?.length
        ? { state: "degraded", failing: failingChecks(body)! }
        : { state: "ready" };
    const failing = failingChecks(body);
    // A real readiness report (503 with a checks list) is "degraded"; any other error page means we could not reach the API.
    return failing !== null && failing.length > 0
      ? { state: "degraded", failing }
      : { state: "unreachable" };
  } catch {
    return { state: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
/**
 * The silent startup check: asks GET /ready once (when the app opens and when the connection comes back) and keeps the answer in the
 * network store. Nothing is shown to the learner and nothing is blocked; the result is only there for code that wants to know.
 */
export async function checkServer(): Promise<Readiness> {
  const result = await getReadiness();
  useNetworkStore.getState().setServerState(result.state);
  return result;
}
