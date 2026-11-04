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
  constructor(message = "Network request failed") {
    super(message);
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
      throw new NetworkError();
    } finally {
      clearTimeout(timeout);
    }
  };

  let res: Response;
  try {
    res = await doFetch(extraHeaders as Record<string, string>);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }

  if (res.status === 401) {
    const { refreshToken, setToken, setRefreshToken, logout, isAuthenticated } = useAuthStore.getState();
    if (refreshToken && isAuthenticated) {
      try {
        const refreshController = new AbortController();
        const refreshTimeout = setTimeout(
          () => refreshController.abort(new Error("Refresh timed out")),
          DEFAULT_TIMEOUT_MS,
        );
        let refreshRes: Response;
        try {
          refreshRes = await fetch(apiUrl("/auth/refresh"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            signal: refreshController.signal,
          });
        } finally {
          clearTimeout(refreshTimeout);
        }
        if (refreshRes.ok) {
          const data = await safeRead(refreshRes);
          const newToken = (data as { token?: string })?.token;
          const rotatedRefresh = (data as { refreshToken?: string })?.refreshToken;
          if (!newToken) throw new ApiError(401, "Session expired");
          setToken(newToken);
          if (rotatedRefresh) setRefreshToken(rotatedRefresh);
          const retryRes = await doFetch(
            {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`,
              ...(extraHeaders as Record<string, string>),
            },
            signal,
          );
          if (!retryRes.ok) throw new ApiError(retryRes.status, `API error: ${retryRes.status}`);
          const retried = await safeRead(retryRes);
          return retried as T;
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        // fall through to logout
      }
    }
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

export async function apiDelete<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, { ...options, method: "DELETE" });
}
