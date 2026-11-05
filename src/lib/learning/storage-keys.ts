/**
 * Every localStorage key that holds one learner's psychometric data on this device, in one place so that nothing that writes them
 * and nothing that wipes them can drift apart. Dependency-free on purpose: the wipe lives in the platform layer, which must not
 * import the services that use these keys.
 */
export const learnerKeys = {
  /** The last server mastery snapshot this device read (the offline base for the event-sourced state). */
  snapshot: (userKey: string) => `zuzumik:mastery-snapshot:${userKey}`,
  /** The learner's IRT ability (theta) state. */
  ability: (userKey: string) => `zuzumik:ability:${userKey}`,
  /** The spaced-repetition review entries. */
  reviewBook: (userKey: string) => `zuzumik:review-book:${userKey}`,
  /** The cold-start warm-up result. */
  calibration: (userKey: string) => `zuzumik:calibration:${userKey}`,
  /** The warm-up in progress. */
  warmupDraft: (userKey: string) => `zuzumik:warmup-draft:${userKey}`,
} as const;

export function allLearnerKeys(userKey: string): string[] {
  return Object.values(learnerKeys).map((key) => key(userKey));
}
