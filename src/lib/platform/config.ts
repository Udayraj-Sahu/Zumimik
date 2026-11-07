export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
export const API_PREFIX = "/api/v1";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zuzumik";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.startsWith("/api/")) return `${API_BASE_URL}${clean}`;
  return `${API_BASE_URL}${API_PREFIX}${clean}`;
}
