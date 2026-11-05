# Vendored psychometrics engine

Unmodified copy of `packages/psychometrics/src` and `packages/shared-types/src/prescription.ts` from the backend monorepo (Speed-Gym-main).
Do NOT edit these files here: re-copy them when the backend package changes, so the app and the server agree on the BKT, IRT,
allocation, fatigue and CLR rules. The app imports them as `@vmsg/psychometrics` and `@vmsg/shared-types` (tsconfig + vitest aliases).
