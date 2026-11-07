import { useAuthStore } from "@/stores/auth-store";
import { apiUrl } from "@/lib/platform";
import { resetAppState } from "@/lib/platform";

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Network request failed", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "NetworkError";
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function mergeSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => !!s);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  const controller = new AbortController();
  active.forEach((s) => {
    if (s.aborted) controller.abort(s.reason);
    else s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  });
  return controller.signal;
}

async function safeRead(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromErrorBody(data: unknown, status: number, statusText: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string") return message;
    }
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((issue: { loc?: unknown[]; msg?: unknown }) => {
        if (typeof issue?.msg !== "string") return [];
        const field = Array.isArray(issue.loc)
          ? issue.loc.filter((part): part is string => typeof part === "string" && part !== "body").at(-1)
          : undefined;
        return [field ? `${field}: ${issue.msg}` : issue.msg];
      });
      if (messages.length) return messages.join("; ");
    }
  }
  return `API error: ${status} ${statusText}`;
}

/**
 * One refresh at a time. The backend rotates refresh tokens and treats re-use of a rotated token as theft (it revokes the
 * family), so N parallel 401s must share ONE /auth/refresh call. Resolves to the new access token, or:
 *  - null when the server explicitly rejected the session (the caller signs the user out), or
 *  - throws NetworkError when the refresh could not be attempted (offline/timeout): the session is NOT ended.
 */
let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const { refreshToken, setToken, setRefreshToken } = useAuthStore.getState();
    if (!refreshToken) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("Refresh timed out")), DEFAULT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
    } catch {
      throw new NetworkError("Could not reach the server to renew your session");
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 500) throw new NetworkError("The server could not renew your session");
    if (!res.ok) return null; // 400/401/403: the refresh token is no longer valid
    const data = (await safeRead(res)) as { token?: string; refreshToken?: string } | undefined;
    if (!data?.token) return null;
    setToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data.token;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: extraHeaders, signal, ...restOptions } = options;
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(new Error("Request timed out")), DEFAULT_TIMEOUT_MS);

  const doFetch = async (headers: Record<string, string>, signalOverride?: AbortSignal | null) => {
    try {
      return await fetch(apiUrl(path), {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
          ...headers,
        },
        ...restOptions,
        signal: mergeSignals(signal, signalOverride, timeoutController.signal),
      });
    } catch (err) {
      if (timeoutController.signal.aborted) {
        throw new ApiError(408, "Request timed out");
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      // fetch rejects with a bare TypeError for every cause (offline, blocked, CORS, a bad header or URL). Keep the real one.
      console.warn("[api] request failed before a response:", restOptions.method ?? "GET", apiUrl(path), err);
      throw new NetworkError(undefined, { cause: err });
    } finally {
      clearTimeout(timeout);
    }
  };

  const tokenAtRequest = useAuthStore.getState().token;
  let res: Response;
  try {
    res = await doFetch(extraHeaders as Record<string, string>);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }

  if (res.status === 401) {
    const { refreshToken, isAuthenticated, token: currentToken, logout } = useAuthStore.getState();
    if (refreshToken && isAuthenticated) {
      // Another request may already have renewed the session while this one was in flight: reuse its token.
      let newToken: string | null =
        currentToken && currentToken !== tokenAtRequest ? currentToken : await refreshAccessToken();
      if (newToken) {
        const retryRes = await doFetch(
          {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
            ...(extraHeaders as Record<string, string>),
          },
          signal,
        );
        if (retryRes.ok) return (await safeRead(retryRes)) as T;
        if (retryRes.status !== 401) {
          const errorData = await safeRead(retryRes);
          throw new ApiError(retryRes.status, messageFromErrorBody(errorData, retryRes.status, retryRes.statusText), errorData);
        }
        newToken = null; // a freshly issued token was refused: the session is genuinely invalid
      }
    }
    // The server rejected the session (or there is none): sign out and clear this user's data.
    logout();
    await resetAppState();
    throw new ApiError(401, "Session expired");
  }
  if (!res.ok) {
    const errorData = await safeRead(res);
    throw new ApiError(
      res.status,
      messageFromErrorBody(errorData, res.status, res.statusText),
      errorData,
    );
  }
  const data = await safeRead(res);
  return data as T;
}

export async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, { ...options, method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, { ...options, method: "DELETE" });
}
