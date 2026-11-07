export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
export const API_PREFIX = "/api/v1";

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zuzumik";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean.startsWith("/api/")) return `${API_BASE_URL}${clean}`;
  return `${API_BASE_URL}${API_PREFIX}${clean}`;
}

/**
 * The public address to put in links that are shared with other people (invite links, QR codes). The installed app and local dev
 * run on https://localhost or http://localhost:3000, which nobody else can open, so there the configured site address
 * (NEXT_PUBLIC_SITE_URL) is used. On a real website the page's own address is kept.
 */
export function shareBaseUrl(origin: string): string {
  const site = SITE_URL.replace(/\/+$/, "");
  const local = !origin || /^(https?|capacitor|ionic):\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.0\.2\.2)(:\d+)?$/i.test(origin);
  return local && site ? site : origin;
}
