export function isDevAuthBypassEnabled(
  nodeEnv = process.env.NODE_ENV,
  bypassFlag = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS,
  mockApiFlag = process.env.NEXT_PUBLIC_API_MOCK,
): boolean {
  return nodeEnv === "development" && bypassFlag === "true" && mockApiFlag === "true";
}
